import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { getMySettings, updateMySettings } from "../api/mailClient";
import type { Session, UserSettings } from "../types/mail";
import { initialsOf } from "../utils/text";

type SettingsPanelProps = {
  session: Session;
  /** Called whenever settings change, so the sidebar name stays in sync. */
  onSettingsChange?: (settings: UserSettings) => void;
};

export function SettingsPanel({ session, onSettingsChange }: SettingsPanelProps) {
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getMySettings(session);
        if (cancelled) return;
        setName(data.name);
        setSignature(data.signature);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Einstellungen konnten nicht geladen werden");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);

    try {
      const updated = await updateMySettings(session, { name, signature });
      onSettingsChange?.(updated);
      setNotice("Gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="reader-panel">
      <header className="reader-header">
        <div>
          <h1>Einstellungen</h1>
          <p>Dein Profil, wie es beim Versenden von Mails angezeigt wird.</p>
        </div>
      </header>

      <article className="message-body settings-body">
        {(error || notice) && (
          <div
            className={error ? "inline-message error" : "inline-message success"}
            role="status"
            aria-live="polite"
          >
            {error || notice}
          </div>
        )}

        {isLoading ? (
          <p className="settings-loading">Lade Einstellungen…</p>
        ) : (
          <form className="settings-form" onSubmit={handleSave}>
            <div className="settings-identity-row">
              <span className="settings-avatar">{initialsOf(name || session.username)}</span>
              <div>
                <strong>{name || session.username}</strong>
                <span className="settings-identity-hint">{session.username}</span>
              </div>
            </div>

            <label>
              Anzeigename
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={session.username}
              />
              <span className="settings-field-hint">
                Erscheint als Absendername, z. B. „{name || session.username}" &lt;
                {session.username}@…&gt;
              </span>
            </label>

            <label>
              Signatur
              <textarea
                value={signature}
                onChange={(event) => setSignature(event.target.value)}
                rows={5}
                placeholder="Viele Grüße&#10;dein Name"
              />
            </label>

            <footer className="settings-form-footer">
              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Speichert…" : "Speichern"}
              </button>
            </footer>
          </form>
        )}
      </article>
    </main>
  );
}
