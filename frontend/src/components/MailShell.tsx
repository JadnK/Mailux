import type { DragEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserManagementPanel } from "./UserManagementPanel";
import {
  deleteMail,
  downloadAttachment,
  getMailbox,
  isRootUser,
  sendMail,
} from "../api/mailClient";
import type { ComposePayload, FolderItem, Mail, Session } from "../types/mail";

const SYSTEM_FOLDERS: FolderItem[] = [
  { id: "INBOX", label: "Posteingang", mailbox: "INBOX", system: true },
  { id: "Sent", label: "Gesendet", mailbox: "Sent", system: true },
  { id: "Drafts", label: "Entwürfe", mailbox: "Drafts", system: true },
  { id: "Archive", label: "Archiv", mailbox: "Archive", system: true },
  { id: "Spam", label: "Spam", mailbox: "Spam", system: true },
  { id: "Trash", label: "Papierkorb", mailbox: "Trash", system: true, destructive: true },
];

const FOLDER_ICONS: Record<string, string> = {
  INBOX:
    "M4 4h16v10.5l-2.2 3.7a2 2 0 0 1-1.72.98H7.92a2 2 0 0 1-1.72-.98L4 14.5V4Zm0 10.5 3 3h10l3-3M4 10h4l1.5 2h5L16 10h4",
  Sent: "M3 11.5 20.5 4 13 20.5l-2.6-6.9L3 11.5Zm0 0 8-1.4",
  Drafts: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  Archive: "M4 7h16v13H4zM4 4h16v3H4zM10 11h4",
  Spam: "M12 3 3 21h18ZM12 9v5m0 3h.01",
  Trash: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13",
};

function folderIcon(mailbox: string): string {
  return FOLDER_ICONS[mailbox] ?? "M4 7h16v13H4zM4 7l8-4 8 4";
}

type MailShellProps = {
  session: Session;
  onLogout: () => void;
};

function formatListDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(date);
}

function formatFullDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

type Address = { name: string; email: string };

function parseAddress(raw: string): Address {
  if (!raw) return { name: "Unbekannt", email: "" };

  const match = raw.match(/^"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    return { name: name || email, email };
  }

  return { name: raw.trim(), email: raw.trim() };
}

function initialsOf(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getSenderAddress(mail: Mail, folder: string): Address {
  if (folder === "Sent") return parseAddress(mail.to || "Unbekannter Empfänger");
  return parseAddress(mail.from || "Unbekannter Absender");
}

function plainPreview(mail?: Mail): string {
  if (!mail) return "";
  const text = mail.text || mail.html?.replace(/<[^>]+>/g, " ") || "";
  return text.replace(/\s+/g, " ").trim();
}

function wrapMailHtml(html: string): string {
  const baseStyle = `<style>
    html, body { margin: 0; }
    body {
      padding: 24px;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
      color: #1c2230;
      background: #ffffff;
      line-height: 1.55;
    }
    img { max-width: 100%; height: auto; }
    a { color: #2454ff; }
    table { max-width: 100%; }
  </style>`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${baseStyle}`);
  }

  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}${baseStyle}`);
  }

  return `${baseStyle}${html}`;
}

const EMPTY_COMPOSE: ComposePayload = {
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  text: "",
  attachments: [],
};

export function MailShell({ session, onLogout }: MailShellProps) {
  const [activeFolder, setActiveFolder] = useState<FolderItem>(SYSTEM_FOLDERS[0]);
  const [activeView, setActiveView] = useState<"mail" | "users">("mail");
  const [mails, setMails] = useState<Mail[]>([]);
  const [folderExists, setFolderExists] = useState(true);
  const [selectedUid, setSelectedUid] = useState<number | string | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isDroppingFile, setIsDroppingFile] = useState(false);
  const [compose, setCompose] = useState<ComposePayload>(EMPTY_COMPOSE);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isRoot = isRootUser(session.username);
  const accountInitials = useMemo(() => initialsOf(session.username), [session.username]);
  const isTrash = activeFolder.mailbox === "Trash";

  const visibleMails = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return mails;

    return mails.filter((mail) => {
      return [mail.from, mail.to, mail.subject, mail.text]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value);
    });
  }, [mails, query]);

  const selectedMail =
    visibleMails.find((mail) => String(mail.uid) === String(selectedUid)) ?? visibleMails[0];

  async function loadFolder(folder = activeFolder) {
    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await getMailbox(session, folder.mailbox);
      setMails(result.mails);
      setFolderExists(result.folderExists);
      setSelectedUid(result.mails[0]?.uid ?? null);
    } catch (err) {
      setMails([]);
      setFolderExists(true);
      setSelectedUid(null);
      setError(err instanceof Error ? err.message : "Ordner konnte nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFolder(SYSTEM_FOLDERS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchFolder(folder: FolderItem) {
    setActiveView("mail");
    setActiveFolder(folder);
    await loadFolder(folder);
  }

  async function handleDelete(mail: Mail | undefined) {
    if (!mail) return;

    if (isTrash) {
      const confirmed = window.confirm(
        `Mail "${mail.subject || "(ohne Betreff)"}" endgültig löschen? Das kann nicht rückgängig gemacht werden.`
      );
      if (!confirmed) return;
    }

    try {
      const result = await deleteMail(session, activeFolder.mailbox, mail.uid);
      setNotice(result.movedToTrash ? "In den Papierkorb verschoben." : "Endgültig gelöscht.");
      await loadFolder(activeFolder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    }
  }

  function addAttachments(files: FileList | File[]) {
    setCompose((prev) => ({
      ...prev,
      attachments: [...(prev.attachments ?? []), ...Array.from(files)],
    }));
  }

  function removeAttachment(index: number) {
    setCompose((prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).filter((_, i) => i !== index),
    }));
  }

  function handleComposeDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDroppingFile(false);
    if (event.dataTransfer.files.length > 0) {
      addAttachments(event.dataTransfer.files);
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSending(true);

    try {
      await sendMail(session, compose);
      setCompose(EMPTY_COMPOSE);
      setShowCcBcc(false);
      setComposeOpen(false);
      setNotice("Nachricht wurde gesendet.");
      if (activeFolder.mailbox === "Sent") await loadFolder(activeFolder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senden fehlgeschlagen");
    } finally {
      setIsSending(false);
    }
  }

  function openReply(mail: Mail) {
    setCompose({
      to: mail.from,
      cc: "",
      bcc: "",
      subject: mail.subject?.startsWith("Re:") ? mail.subject : `Re: ${mail.subject || ""}`,
      text: `\n\n--- Original ---\n${plainPreview(mail)}`,
      attachments: [],
    });
    setShowCcBcc(false);
    setComposeOpen(true);
  }

  async function handleDownloadAttachment(mail: Mail, attachmentIndex: number, filename: string) {
    try {
      await downloadAttachment(session, activeFolder.mailbox, mail.uid, attachmentIndex, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anhang konnte nicht geladen werden");
    }
  }

  const selectedAddress = selectedMail ? parseAddress(selectedMail.from || "") : null;

  return (
    <div className="mail-app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="account-block">
            <div className="product-name">Mailux</div>
            <div className="account-line">
              <span className="account-avatar">{accountInitials}</span>
              <span>{session.username}</span>
              {isRoot && <span className="root-pill">root</span>}
            </div>
          </div>
          <button className="icon-button" onClick={onLogout} title="Abmelden" aria-label="Abmelden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>

        <button
          className="compose-button"
          onClick={() => {
            setCompose(EMPTY_COMPOSE);
            setShowCcBcc(false);
            setComposeOpen(true);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Neue Nachricht
        </button>

        {isRoot && (
          <button
            className={`secondary-nav-button ${activeView === "users" ? "active" : ""}`}
            onClick={() => setActiveView("users")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            User verwalten
          </button>
        )}

        <nav className="folder-list" aria-label="Mail folders">
          {SYSTEM_FOLDERS.map((folder) => (
            <button
              key={folder.mailbox}
              className={`folder-button ${
                activeView === "mail" && activeFolder.mailbox === folder.mailbox ? "active" : ""
              } ${folder.destructive ? "danger-folder" : ""}`}
              onClick={() => switchFolder(folder)}
            >
              <span className="folder-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={folderIcon(folder.mailbox)} />
                </svg>
                {folder.label}
              </span>
              {folder.mailbox === "INBOX" && mails.length > 0 && activeFolder.mailbox === "INBOX" && (
                <span className="folder-count">{mails.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>IMAP verbunden</span>
        </div>
      </aside>

      {activeView === "mail" && (
        <section className="message-list-panel">
          <header className="panel-header">
            <div>
              <h2>{activeFolder.label}</h2>
              <p>
                {isLoading
                  ? "Lade Nachrichten…"
                  : folderExists
                    ? `${visibleMails.length} Nachrichten`
                    : "Ordner nicht vorhanden"}
              </p>
            </div>
            <button className="ghost-button icon-only" onClick={() => loadFolder(activeFolder)} title="Aktualisieren" aria-label="Aktualisieren">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </header>

          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nachrichten durchsuchen"
              aria-label="Nachrichten durchsuchen"
            />
          </div>

          {(error || notice) && (
            <div
              className={error ? "inline-message error" : "inline-message success"}
              role="status"
              aria-live="polite"
            >
              {error || notice}
            </div>
          )}

          <div className="message-list">
            {isLoading && visibleMails.length === 0 && (
              <div className="message-list-skeleton">
                {[0, 1, 2, 3, 4].map((key) => (
                  <div className="skeleton-row" key={key}>
                    <div className="skeleton-avatar" />
                    <div className="skeleton-lines">
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line long" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !folderExists && (
              <div className="empty-list">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16v13H4zM4 7l8-4 8 4" />
                </svg>
                <h3>Ordner nicht vorhanden</h3>
                <p>
                  Dieses Postfach hat noch keinen &quot;{activeFolder.label}&quot;-Ordner auf dem Mailserver.
                </p>
              </div>
            )}

            {!isLoading && folderExists && visibleMails.length === 0 && (
              <div className="empty-list">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v10.5l-2.2 3.7a2 2 0 0 1-1.72.98H7.92a2 2 0 0 1-1.72-.98L4 14.5V4Z" />
                  <path d="M4 4l8 7 8-7" />
                </svg>
                <h3>Keine Nachrichten</h3>
                <p>Dieser Ordner ist leer.</p>
              </div>
            )}

            {visibleMails.map((mail) => {
              const sender = getSenderAddress(mail, activeFolder.mailbox);
              return (
                <button
                  key={String(mail.uid)}
                  className={`message-row ${
                    String(selectedMail?.uid) === String(mail.uid) ? "selected" : ""
                  }`}
                  onClick={() => setSelectedUid(mail.uid)}
                >
                  <span className="message-avatar">{initialsOf(sender.name)}</span>
                  <span className="message-row-body">
                    <span className="message-row-top">
                      <strong>{sender.name}</strong>
                      <span className="message-date">{formatListDate(mail.date)}</span>
                    </span>
                    <span className="message-subject">{mail.subject || "(ohne Betreff)"}</span>
                    <span className="message-snippet">{plainPreview(mail) || "Keine Vorschau verfügbar."}</span>
                    {mail.attachments.length > 0 && (
                      <span className="message-meta-row">
                        <span className="attachment-indicator">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L10.13 17.1a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                          {mail.attachments.length}
                        </span>
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {activeView === "users" ? (
        <UserManagementPanel session={session} />
      ) : (
        <main className="reader-panel">
          {selectedMail ? (
            <>
              <header className="reader-header">
                <div className="reader-heading">
                  <span className="reader-avatar">{initialsOf(selectedAddress?.name ?? "?")}</span>
                  <div>
                    <h1>{selectedMail.subject || "(ohne Betreff)"}</h1>
                    <p>
                      <strong>{selectedAddress?.name}</strong>
                      {selectedAddress?.email && selectedAddress.email !== selectedAddress.name && (
                        <span className="reader-address"> &lt;{selectedAddress.email}&gt;</span>
                      )}
                      {selectedMail.to && (
                        <>
                          {" "}
                          · an <strong>{selectedMail.to}</strong>
                        </>
                      )}
                    </p>
                    <p className="reader-date">{formatFullDate(selectedMail.date)}</p>
                  </div>
                </div>

                <div className="reader-actions">
                  <button className="ghost-button" onClick={() => openReply(selectedMail)}>
                    Antworten
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => handleDelete(selectedMail)}
                    title={isTrash ? "Endgültig löschen" : "In den Papierkorb verschieben"}
                  >
                    {isTrash ? "Endgültig löschen" : "Löschen"}
                  </button>
                </div>
              </header>

              {selectedMail.attachments.length > 0 && (
                <div className="attachment-list">
                  {selectedMail.attachments.map((attachment) => (
                    <span className="attachment-chip" key={attachment.index}>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadAttachment(selectedMail, attachment.index, attachment.filename)
                        }
                        title={`${attachment.filename} herunterladen`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L10.13 17.1a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span className="attachment-name">{attachment.filename}</span>
                        <span className="attachment-size">{formatBytes(attachment.size)}</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <article className="message-body">
                {selectedMail.html ? (
                  <iframe title="Nachricht" sandbox="" srcDoc={wrapMailHtml(selectedMail.html)} />
                ) : (
                  <pre>{selectedMail.text || "Diese Nachricht hat keinen lesbaren Inhalt."}</pre>
                )}
              </article>
            </>
          ) : (
            <div className="empty-reader">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v10.5l-2.2 3.7a2 2 0 0 1-1.72.98H7.92a2 2 0 0 1-1.72-.98L4 14.5V4Z" />
                <path d="M4 4l8 7 8-7" />
              </svg>
              <h2>Keine Nachricht ausgewählt</h2>
              <p>Wähle links eine Nachricht aus oder aktualisiere den Ordner.</p>
            </div>
          )}
        </main>
      )}

      {composeOpen && (
        <div className="compose-overlay" role="dialog" aria-modal="true">
          <form
            className={`compose-window ${isDroppingFile ? "dropping" : ""}`}
            onSubmit={handleSend}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDroppingFile(true);
            }}
            onDragLeave={() => setIsDroppingFile(false)}
            onDrop={handleComposeDrop}
          >
            <header>
              <strong>Neue Nachricht</strong>
              <button
                type="button"
                className="icon-button"
                onClick={() => setComposeOpen(false)}
                aria-label="Schließen"
              >
                ×
              </button>
            </header>

            <div className="compose-body">
              <input
                value={compose.to}
                onChange={(event) => setCompose({ ...compose, to: event.target.value })}
                placeholder="An"
                aria-label="Empfänger"
                required
              />

              {!showCcBcc && (
                <button
                  type="button"
                  className="text-button compose-cc-toggle"
                  onClick={() => setShowCcBcc(true)}
                >
                  Cc/Bcc hinzufügen
                </button>
              )}

              {showCcBcc && (
                <>
                  <input
                    value={compose.cc}
                    onChange={(event) => setCompose({ ...compose, cc: event.target.value })}
                    placeholder="Cc"
                    aria-label="Cc"
                  />
                  <input
                    value={compose.bcc}
                    onChange={(event) => setCompose({ ...compose, bcc: event.target.value })}
                    placeholder="Bcc"
                    aria-label="Bcc"
                  />
                </>
              )}

              <input
                value={compose.subject}
                onChange={(event) => setCompose({ ...compose, subject: event.target.value })}
                placeholder="Betreff"
                aria-label="Betreff"
              />
              <textarea
                value={compose.text}
                onChange={(event) => setCompose({ ...compose, text: event.target.value })}
                placeholder="Nachricht schreiben… (Dateien lassen sich auch hierher ziehen)"
                aria-label="Nachricht"
                required
              />

              {(compose.attachments ?? []).length > 0 && (
                <div className="attachment-list">
                  {(compose.attachments ?? []).map((file, index) => (
                    <span className="attachment-chip pending" key={`${file.name}-${index}`}>
                      <span className="attachment-name">{file.name}</span>
                      <span className="attachment-size">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        className="remove-attachment"
                        onClick={() => removeAttachment(index)}
                        aria-label={`${file.name} entfernen`}
                        title="Entfernen"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="compose-attach-input"
              onChange={(event) => {
                if (event.target.files) addAttachments(event.target.files);
                event.target.value = "";
              }}
            />

            <footer>
              <div className="compose-footer-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Datei anhängen"
                  aria-label="Datei anhängen"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L10.13 17.1a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button type="button" className="ghost-button" onClick={() => setComposeOpen(false)}>
                  Abbrechen
                </button>
              </div>
              <button className="primary-button" disabled={isSending}>
                {isSending ? "Sende…" : "Senden"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
