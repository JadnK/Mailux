import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteMail,
  getCustomFolders,
  getInbox,
  getSent,
  isRootUser,
  sendMail
} from "../api/mailClient";
import type { ComposePayload, FolderItem, Mail, Session } from "../types/mail";

const SYSTEM_FOLDERS: FolderItem[] = [
  { id: "INBOX", label: "Inbox", mailbox: "INBOX", system: true },
  { id: "Sent", label: "Sent", mailbox: "Sent", system: true },
  { id: "Drafts", label: "Drafts", mailbox: "Drafts", system: true },
  { id: "Archive", label: "Archive", mailbox: "Archive", system: true },
  { id: "Spam", label: "Spam", mailbox: "Spam", system: true },
  { id: "Trash", label: "Trash", mailbox: "Trash", system: true, destructive: true }
];

type MailShellProps = {
  session: Session;
  onLogout: () => void;
};

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getSender(mail: Mail, folder: string): string {
  if (folder === "Sent") return mail.to || "Unbekannter Empfänger";
  return mail.from || "Unbekannter Absender";
}

function plainPreview(mail?: Mail): string {
  if (!mail) return "";
  const text = mail.text || mail.html?.replace(/<[^>]+>/g, " ") || "";
  return text.replace(/\s+/g, " ").trim();
}

export function MailShell({ session, onLogout }: MailShellProps) {
  const [activeFolder, setActiveFolder] = useState<FolderItem>(SYSTEM_FOLDERS[0]);
  const [customFolders, setCustomFolders] = useState<FolderItem[]>([]);
  const [mails, setMails] = useState<Mail[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | string | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState<ComposePayload>({
    to: "",
    subject: "",
    text: ""
  });

  const canHardDelete = isRootUser(session.username);

  const folders = useMemo(() => {
    const existing = new Set(SYSTEM_FOLDERS.map((folder) => folder.mailbox));
    const uniqueCustom = customFolders.filter((folder) => !existing.has(folder.mailbox));
    return [...SYSTEM_FOLDERS, ...uniqueCustom];
  }, [customFolders]);

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
    visibleMails.find((mail) => String(mail.uid) === String(selectedUid)) ??
    visibleMails[0];

  async function loadFolder(folder = activeFolder) {
    setIsLoading(true);
    setError("");
    setNotice("");

    try {
      let nextMails: Mail[] = [];

      if (folder.mailbox === "INBOX") {
        nextMails = await getInbox(session);
      } else if (folder.mailbox === "Sent") {
        nextMails = await getSent(session);
      } else {
        nextMails = [];
        setNotice(`${folder.label} ist im Frontend vorbereitet. Der Backend-Reader für diesen IMAP-Ordner fehlt noch.`);
      }

      setMails(nextMails);
      setSelectedUid(nextMails[0]?.uid ?? null);
    } catch (err) {
      setMails([]);
      setSelectedUid(null);
      setError(err instanceof Error ? err.message : "Ordner konnte nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFolders() {
    try {
      const names = await getCustomFolders(session);
      setCustomFolders(
        names.map((name) => ({
          id: name,
          label: name,
          mailbox: name
        }))
      );
    } catch {
      setCustomFolders([]);
    }
  }

  useEffect(() => {
    loadFolders();
    loadFolder(SYSTEM_FOLDERS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchFolder(folder: FolderItem) {
    setActiveFolder(folder);
    await loadFolder(folder);
  }

  async function handleDelete(mail: Mail | undefined) {
    if (!mail) return;

    if (!canHardDelete) {
      setError("Nur root darf endgültig löschen. Normale Nutzer sollten später nach Trash verschieben.");
      return;
    }

    const confirmed = window.confirm(
      `Mail "${mail.subject || "(ohne Betreff)"}" aus ${activeFolder.mailbox} endgültig löschen?`
    );

    if (!confirmed) return;

    try {
      await deleteMail(session, activeFolder.mailbox, mail.uid);
      setNotice("Mail wurde gelöscht.");
      await loadFolder(activeFolder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      await sendMail(session, compose);
      setCompose({ to: "", subject: "", text: "" });
      setComposeOpen(false);
      setNotice("Nachricht wurde gesendet.");
      if (activeFolder.mailbox === "Sent") await loadFolder(activeFolder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senden fehlgeschlagen");
    }
  }

  return (
    <div className="mail-app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <div className="product-name">Mailux</div>
            <div className="account-line">
              {session.username}
              {canHardDelete && <span className="root-pill">root</span>}
            </div>
          </div>
          <button className="icon-button" onClick={onLogout} title="Abmelden">
            ⎋
          </button>
        </div>

        <button className="compose-button" onClick={() => setComposeOpen(true)}>
          Neue Nachricht
        </button>

        <nav className="folder-list" aria-label="Mail folders">
          {folders.map((folder) => (
            <button
              key={folder.mailbox}
              className={`folder-button ${activeFolder.mailbox === folder.mailbox ? "active" : ""} ${
                folder.destructive ? "danger-folder" : ""
              }`}
              onClick={() => switchFolder(folder)}
            >
              <span>{folder.label}</span>
              {folder.mailbox === "INBOX" && mails.length > 0 && activeFolder.mailbox === "INBOX" && (
                <span className="folder-count">{mails.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>IMAP</span>
          <span className="status-dot" />
          <span>Verbunden</span>
        </div>
      </aside>

      <section className="message-list-panel">
        <header className="panel-header">
          <div>
            <h2>{activeFolder.label}</h2>
            <p>{isLoading ? "Lade Nachrichten…" : `${visibleMails.length} Nachrichten`}</p>
          </div>
          <button className="ghost-button" onClick={() => loadFolder(activeFolder)}>
            Aktualisieren
          </button>
        </header>

        <div className="search-box">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Suchen"
          />
        </div>

        {(error || notice) && (
          <div className={error ? "inline-message error" : "inline-message"}>
            {error || notice}
          </div>
        )}

        <div className="message-list">
          {!isLoading && visibleMails.length === 0 && (
            <div className="empty-list">Keine Nachrichten in diesem Ordner.</div>
          )}

          {visibleMails.map((mail) => (
            <button
              key={String(mail.uid)}
              className={`message-row ${
                String(selectedMail?.uid) === String(mail.uid) ? "selected" : ""
              }`}
              onClick={() => setSelectedUid(mail.uid)}
            >
              <div className="message-row-top">
                <strong>{getSender(mail, activeFolder.mailbox)}</strong>
                <span>{formatDate(mail.date)}</span>
              </div>
              <div className="message-subject">{mail.subject || "(ohne Betreff)"}</div>
              <p>{plainPreview(mail) || "Keine Vorschau verfügbar."}</p>
            </button>
          ))}
        </div>
      </section>

      <main className="reader-panel">
        {selectedMail ? (
          <>
            <header className="reader-header">
              <div>
                <h1>{selectedMail.subject || "(ohne Betreff)"}</h1>
                <p>
                  Von <strong>{selectedMail.from || "unbekannt"}</strong>
                  {selectedMail.to && <> an <strong>{selectedMail.to}</strong></>}
                </p>
              </div>

              <div className="reader-actions">
                <button
                  className="ghost-button"
                  onClick={() => {
                    setCompose({
                      to: selectedMail.from,
                      subject: selectedMail.subject?.startsWith("Re:")
                        ? selectedMail.subject
                        : `Re: ${selectedMail.subject || ""}`,
                      text: `\n\n--- Original ---\n${plainPreview(selectedMail)}`
                    });
                    setComposeOpen(true);
                  }}
                >
                  Antworten
                </button>
                <button
                  className="danger-button"
                  disabled={!canHardDelete}
                  onClick={() => handleDelete(selectedMail)}
                  title={canHardDelete ? "Endgültig löschen" : "Nur root darf endgültig löschen"}
                >
                  Löschen
                </button>
              </div>
            </header>

            <article className="message-body">
              {selectedMail.html ? (
                <iframe
                  title="Nachricht"
                  sandbox=""
                  srcDoc={selectedMail.html}
                />
              ) : (
                <pre>{selectedMail.text || "Diese Nachricht hat keinen lesbaren Inhalt."}</pre>
              )}
            </article>
          </>
        ) : (
          <div className="empty-reader">
            <h2>Keine Nachricht ausgewählt</h2>
            <p>Wähle links eine Nachricht aus oder aktualisiere den Ordner.</p>
          </div>
        )}
      </main>

      {composeOpen && (
        <div className="compose-overlay" role="dialog" aria-modal="true">
          <form className="compose-window" onSubmit={handleSend}>
            <header>
              <strong>Neue Nachricht</strong>
              <button type="button" className="icon-button" onClick={() => setComposeOpen(false)}>
                ×
              </button>
            </header>

            <input
              value={compose.to}
              onChange={(event) => setCompose({ ...compose, to: event.target.value })}
              placeholder="An"
              required
            />
            <input
              value={compose.subject}
              onChange={(event) => setCompose({ ...compose, subject: event.target.value })}
              placeholder="Betreff"
            />
            <textarea
              value={compose.text}
              onChange={(event) => setCompose({ ...compose, text: event.target.value })}
              placeholder="Nachricht schreiben…"
              required
            />
            <footer>
              <button type="button" className="ghost-button" onClick={() => setComposeOpen(false)}>
                Abbrechen
              </button>
              <button className="primary-button">Senden</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
