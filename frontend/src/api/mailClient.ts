import type { ComposePayload, Mail, Session } from "../types/mail";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const API_KEY = import.meta.env.VITE_API_KEY;

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      // keep fallback
    }

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

export async function login(username: string, password: string): Promise<Session> {
  return request<Session>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function getInbox(session: Session): Promise<Mail[]> {
  return request<Mail[]>(
    `/mail/inbox/${encodeURIComponent(session.username)}`,
    {},
    session.token
  );
}

export async function getSent(session: Session): Promise<Mail[]> {
  return request<Mail[]>(
    `/mail/sent/${encodeURIComponent(session.username)}`,
    {},
    session.token
  );
}

export async function getCustomFolders(session: Session): Promise<string[]> {
  return request<string[]>(
    `/mail/folder/${encodeURIComponent(session.username)}`,
    {},
    session.token
  );
}

export async function sendMail(
  session: Session,
  payload: ComposePayload
): Promise<void> {
  await request(
    "/mail/send",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    session.token
  );
}

export async function deleteMail(
  session: Session,
  mailbox: string,
  uid: number | string
): Promise<void> {
  await request(
    "/mail/delete",
    {
      method: "DELETE",
      body: JSON.stringify({ mailbox, uid: Number(uid) })
    },
    session.token
  );
}

export function isRootUser(username: string): boolean {
  return username.trim().toLowerCase() === "root";
}

export type ManagedUser = {
  username: string;
  name?: string;
  profilePicture?: string;
  signature?: string;
  canReceiveMail?: boolean;
};

export async function getUsers(session: Session): Promise<ManagedUser[]> {
  return request<ManagedUser[]>("/users", {}, session.token);
}

export async function createUser(
  session: Session,
  username: string,
  password: string
): Promise<void> {
  await request(
    "/users/create",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    session.token
  );
}

export async function deleteUser(
  session: Session,
  username: string
): Promise<void> {
  await request(
    `/users/${encodeURIComponent(username)}`,
    {
      method: "DELETE",
    },
    session.token
  );
}