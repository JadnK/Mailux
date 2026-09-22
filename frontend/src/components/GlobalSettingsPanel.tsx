import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { getGlobalSettings, updateGlobalSettings } from "../api/mailClient";
import type { GlobalSettings, Session } from "../types/mail";

type GlobalSettingsPanelProps = {
  session: Session;
};

export function GlobalSettingsPanel({ session }: GlobalSettingsPanelProps) {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [defaultSignature, setDefaultSignature] = useState("");
  const [maxStorageMB, setMaxStorageMB] = useState(1024);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getGlobalSettings(session);
        if (cancelled) return;
        setSettings(data);
        setDefaultSignature(data.defaultSignature);
        setMaxStorageMB(data.maxStorageMB);
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
      const updated = await updateGlobalSettings(session, { defaultSignature, maxStorageMB });
      setSettings(updated);
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
          <h1>Server-Einstellungen</h1>
          <p>Gilt für die gesamte Mailux-Installation.</p>
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

        {isLoading || !settings ? (
          <p className="settings-loading">Lade Einstellungen…</p>
        ) : (
          <form className="settings-form" onSubmit={handleSave}>
            <label>
              Standard-Signatur
              <textarea
                value={defaultSignature}
                onChange={(event) => setDefaultSignature(event.target.value)}
                rows={4}
              />
              <span className="settings-field-hint">
                Vorbelegung für neu angelegte Mailboxen - jeder User kann sie danach unter
                „Einstellungen" selbst ändern.
              </span>
            </label>

            <label>
              Speicherlimit pro Postfach (MB)
              <input
                type="number"
                min={0}
                value={maxStorageMB}
                onChange={(event) => setMaxStorageMB(Number(event.target.value))}
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
