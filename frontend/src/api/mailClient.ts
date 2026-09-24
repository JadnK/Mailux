import type {
  ComposePayload,
  DeleteResult,
  GlobalSettings,
  MailboxResponse,
  MailboxUsage,
  MailFolder,
  MailTemplate,
  Session,
  UserSettings,
} from "../types/mail";

// Relative by default: Mailux expects the frontend and the backend API to
// be reachable under the same origin, with a reverse proxy forwarding
// "/api" to the backend (see docs/DEPLOYMENT.md - Reverse proxy section).
// That's what makes this work when you open the app from any machine, not
// just from the server itself. Only set VITE_API_BASE_URL at build time if
// your backend lives on a different origin than the frontend.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

const API_KEY = import.meta.env.VITE_API_KEY;

function authHeaders(token?: string): Record<string, string> {
  return {
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function handleResponse<T>(response: Response, token?: string): Promise<T> {
  if (!response.ok) {
    const message = await parseErrorMessage(response, `Request failed (${response.status})`);

    if (response.status === 401 && token) {
      window.dispatchEvent(new CustomEvent("mailux:session-expired"));
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
      ...(options.headers ?? {}),
    },
  });

  return handleResponse<T>(response, token);
}

export async function login(username: string, password: string): Promise<Session> {
  return requestJson<Session>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Revokes the session token server-side, so it can't keep being used after
// logout (e.g. if it leaked, or was left behind on a shared computer).
export async function logout(session: Session): Promise<void> {
  return requestJson<void>("/logout", { method: "POST" }, session.token);
}

export async function getMailbox(session: Session, mailbox: string): Promise<MailboxResponse> {
  return requestJson<MailboxResponse>(
    `/mail/box/${encodeURIComponent(mailbox)}`,
    {},
    session.token
  );
}

export async function sendMail(session: Session, payload: ComposePayload): Promise<void> {
  const form = new FormData();
  form.set("to", payload.to);
  if (payload.cc) form.set("cc", payload.cc);
  if (payload.bcc) form.set("bcc", payload.bcc);
  form.set("subject", payload.subject);
  form.set("text", payload.text);
  if (payload.html) form.set("html", payload.html);

  for (const file of payload.attachments ?? []) {
    form.append("attachments", file, file.name);
  }

  // Don't set Content-Type manually here - the browser needs to add the
  // multipart boundary itself.
  const response = await fetch(`${API_BASE}/mail/send`, {
    method: "POST",
    headers: authHeaders(session.token),
    body: form,
  });

  await handleResponse<void>(response, session.token);
}

export async function deleteMail(
  session: Session,
  mailbox: string,
  uid: number | string
): Promise<DeleteResult> {
  return requestJson<DeleteResult>(
    "/mail/delete",
    {
      method: "DELETE",
      body: JSON.stringify({ mailbox, uid: Number(uid) }),
    },
    session.token
  );
}

export async function markAsRead(
  session: Session,
  mailbox: string,
  uid: number | string
): Promise<void> {
  await requestJson<{ message: string }>(
    `/mail/box/${encodeURIComponent(mailbox)}/${encodeURIComponent(String(uid))}/read`,
    { method: "PATCH" },
    session.token
  );
}

export async function markAsUnread(
  session: Session,
  mailbox: string,
  uid: number | string
): Promise<void> {
  await requestJson<{ message: string }>(
    `/mail/box/${encodeURIComponent(mailbox)}/${encodeURIComponent(String(uid))}/unread`,
    { method: "PATCH" },
    session.token
  );
}

export async function setFlagged(
  session: Session,
  mailbox: string,
  uid: number | string,
  flagged: boolean
): Promise<void> {
  await requestJson<{ message: string }>(
    `/mail/box/${encodeURIComponent(mailbox)}/${encodeURIComponent(String(uid))}/flag`,
    { method: "PATCH", body: JSON.stringify({ flagged }) },
    session.token
  );
}

export async function listFolders(session: Session): Promise<MailFolder[]> {
  const result = await requestJson<{ folders: MailFolder[] }>("/mail/folders", {}, session.token);
  return result.folders;
}

export async function createFolder(session: Session, name: string): Promise<void> {
  await requestJson(
    "/mail/folders",
    { method: "POST", body: JSON.stringify({ name }) },
    session.token
  );
}

export async function moveMail(
  session: Session,
  mailbox: string,
  uid: number | string,
  target: string
): Promise<void> {
  await requestJson(
    `/mail/box/${encodeURIComponent(mailbox)}/${encodeURIComponent(String(uid))}/move`,
    { method: "PATCH", body: JSON.stringify({ target }) },
    session.token
  );
}

export function attachmentDownloadUrl(mailbox: string, uid: number | string, index: number): string {
  return `${API_BASE}/mail/attachment/${encodeURIComponent(mailbox)}/${encodeURIComponent(
    String(uid)
  )}/${index}`;
}

/**
 * Downloads an attachment and saves it via the browser. A plain <a href>
 * can't carry the Authorization header, so this fetches the file as a blob
 * and triggers the save from JS instead.
 */
export async function downloadAttachment(
  session: Session,
  mailbox: string,
  uid: number | string,
  index: number,
  filename: string
): Promise<void> {
  const response = await fetch(attachmentDownloadUrl(mailbox, uid, index), {
    headers: authHeaders(session.token),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Attachment download failed"));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function isRootUser(username: string): boolean {
  return username.trim().toLowerCase() === "root";
}

export type ManagedUser = {
  username: string;
  name?: string;
  signature?: string;
  canReceiveMail?: boolean;
  isAdmin?: boolean;
};

export async function getUsers(session: Session): Promise<ManagedUser[]> {
  return requestJson<ManagedUser[]>("/users", {}, session.token);
}

export async function createUser(
  session: Session,
  username: string,
  password: string,
  isAdmin = false
): Promise<void> {
  await requestJson(
    "/users/create",
    {
      method: "POST",
      body: JSON.stringify({ username, password, isAdmin }),
    },
    session.token
  );
}

export async function deleteUser(session: Session, username: string): Promise<void> {
  await requestJson(
    `/users/${encodeURIComponent(username)}`,
    { method: "DELETE" },
    session.token
  );
}

export async function setUserAdmin(
  session: Session,
  username: string,
  isAdmin: boolean
): Promise<void> {
  await requestJson(
    `/users/${encodeURIComponent(username)}/admin`,
    { method: "PATCH", body: JSON.stringify({ isAdmin }) },
    session.token
  );
}

// ---------- own settings (incl. forwarding + autoresponder) ----------

export async function getMySettings(session: Session): Promise<UserSettings> {
  return requestJson<UserSettings>("/settings/me", {}, session.token);
}

export type MySettingsUpdate = {
  name?: string;
  signature?: string;
  vacationMode?: boolean;
  vacationSubject?: string;
  vacationMessage?: string;
  vacationStart?: string | null;
  vacationEnd?: string | null;
  forwardingAddress?: string | null;
};

export async function updateMySettings(
  session: Session,
  updates: MySettingsUpdate
): Promise<UserSettings> {
  return requestJson<UserSettings>(
    "/settings/me",
    { method: "PATCH", body: JSON.stringify(updates) },
    session.token
  );
}

export async function changeMyPassword(
  session: Session,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await requestJson(
    "/settings/me/password",
    { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) },
    session.token
  );
}

export async function getMyUsage(session: Session): Promise<MailboxUsage> {
  return requestJson<MailboxUsage>("/settings/me/usage", {}, session.token);
}

// ---------- own quick-reply templates ----------

export async function getMyTemplates(session: Session): Promise<MailTemplate[]> {
  const result = await requestJson<{ templates: MailTemplate[] }>(
    "/settings/me/templates",
    {},
    session.token
  );
  return result.templates;
}

export async function createMyTemplate(
  session: Session,
  name: string,
  body: string
): Promise<MailTemplate> {
  return requestJson<MailTemplate>(
    "/settings/me/templates",
    { method: "POST", body: JSON.stringify({ name, body }) },
    session.token
  );
}

export async function updateMyTemplate(
  session: Session,
  id: string,
  updates: { name?: string; body?: string }
): Promise<MailTemplate> {
  return requestJson<MailTemplate>(
    `/settings/me/templates/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(updates) },
    session.token
  );
}

export async function deleteMyTemplate(session: Session, id: string): Promise<void> {
  await requestJson(
    `/settings/me/templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    session.token
  );
}

// ---------- site-wide settings (admins only) ----------

export async function getGlobalSettings(session: Session): Promise<GlobalSettings> {
  return requestJson<GlobalSettings>("/settings/global", {}, session.token);
}

export async function updateGlobalSettings(
  session: Session,
  updates: Partial<GlobalSettings>
): Promise<GlobalSettings> {
  return requestJson<GlobalSettings>(
    "/settings/global",
    { method: "PATCH", body: JSON.stringify(updates) },
    session.token
  );
}
