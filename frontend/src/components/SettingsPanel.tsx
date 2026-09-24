import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  createMyTemplate,
  deleteMyTemplate,
  getMySettings,
  getMyUsage,
  getMyTemplates,
  updateMySettings,
  updateMyTemplate,
} from "../api/mailClient";
import type { MailTemplate, MailboxUsage, Session, UserSettings } from "../types/mail";
import { initialsOf } from "../utils/text";

type SettingsPanelProps = {
  session: Session;
  /** Called whenever settings change, so the sidebar name stays in sync. */
  onSettingsChange?: (settings: UserSettings) => void;
};

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

export function SettingsPanel({ session, onSettingsChange }: SettingsPanelProps) {
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [forwardingAddress, setForwardingAddress] = useState("");
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationMessage, setVacationMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRouting, setIsSavingRouting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [routingNotice, setRoutingNotice] = useState("");
  const [routingError, setRoutingError] = useState("");

  const [usage, setUsage] = useState<MailboxUsage | null>(null);

  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const [data, usageData, templateData] = await Promise.all([
          getMySettings(session),
          getMyUsage(session).catch(() => null),
          getMyTemplates(session).catch(() => []),
        ]);
        if (cancelled) return;
        setName(data.name);
        setSignature(data.signature);
        setForwardingAddress(data.forwardingAddress ?? "");
        setVacationMode(data.vacationMode);
        setVacationMessage(data.vacationMessage ?? "");
        setUsage(usageData);
        setTemplates(templateData);
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

  async function handleSaveRouting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoutingError("");
    setRoutingNotice("");
    setIsSavingRouting(true);

    try {
      const updated = await updateMySettings(session, {
        forwardingAddress: forwardingAddress.trim() || null,
        vacationMode,
        vacationMessage,
      });
      setForwardingAddress(updated.forwardingAddress ?? "");
      setVacationMode(updated.vacationMode);
      setVacationMessage(updated.vacationMessage ?? "");
      setRoutingNotice("Gespeichert - wird sofort auf neue Mails angewendet.");
    } catch (err) {
      setRoutingError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSavingRouting(false);
    }
  }

  async function handleAddTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTemplateError("");

    const name = newTemplateName.trim();
    if (!name || !newTemplateBody.trim()) {
      setTemplateError("Name und Text sind Pflicht.");
      return;
    }

    try {
      const template = await createMyTemplate(session, name, newTemplateBody);
      setTemplates((prev) => [...prev, template]);
      setNewTemplateName("");
      setNewTemplateBody("");
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Vorlage konnte nicht erstellt werden");
    }
  }

  async function handleDeleteTemplate(id: string) {
    const previous = templates;
    setTemplates((prev) => prev.filter((template) => template.id !== id));

    try {
      await deleteMyTemplate(session, id);
    } catch (err) {
      setTemplates(previous);
      setTemplateError(err instanceof Error ? err.message : "Vorlage konnte nicht gelöscht werden");
    }
  }

  async function handleRenameTemplate(id: string, nextName: string) {
    try {
      const updated = await updateMyTemplate(session, id, { name: nextName });
      setTemplates((prev) => prev.map((template) => (template.id === id ? updated : template)));
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : "Vorlage konnte nicht gespeichert werden");
    } finally {
      setEditingTemplateId(null);
    }
  }

  const usagePercent =
    usage && usage.limitBytes > 0 ? Math.min(100, (usage.usedBytes / usage.limitBytes) * 100) : null;

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
          <>
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

            {usage && (
              <section className="settings-section usage-section">
                <div className="settings-section-heading">
                  <h2>Speicherplatz</h2>
                  <p>Wie viel Platz dein Postfach aktuell belegt.</p>
                </div>
                <div className="usage-bar-track">
                  <div
                    className={`usage-bar-fill ${usagePercent !== null && usagePercent > 90 ? "usage-bar-fill--full" : ""}`}
                    style={{ width: `${usagePercent ?? 0}%` }}
                  />
                </div>
                <p className="settings-field-hint">
                  {formatBytes(usage.usedBytes)}
                  {usage.limitBytes > 0 && <> von {formatBytes(usage.limitBytes)}</>}
                </p>
              </section>
            )}

            <form className="settings-form settings-section" onSubmit={handleSaveRouting}>
              <div className="settings-section-heading">
                <h2>Weiterleitung &amp; Autoresponder</h2>
                <p>
                  Mails bleiben immer zusätzlich in diesem Postfach - Weiterleitung und
                  Autoresponder wirken sofort auf neu eintreffende Mails.
                </p>
              </div>

              {(routingError || routingNotice) && (
                <div
                  className={routingError ? "inline-message error" : "inline-message success"}
                  role="status"
                  aria-live="polite"
                >
                  {routingError || routingNotice}
                </div>
              )}

              <label>
                Weiterleiten an
                <input
                  type="email"
                  value={forwardingAddress}
                  onChange={(event) => setForwardingAddress(event.target.value)}
                  placeholder="z. B. name@anderer-anbieter.de (leer lassen zum Deaktivieren)"
                />
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={vacationMode}
                  onChange={(event) => setVacationMode(event.target.checked)}
                />
                Automatische Antwort (Abwesenheitsnotiz) senden
              </label>

              {vacationMode && (
                <label>
                  Text der automatischen Antwort
                  <textarea
                    value={vacationMessage}
                    onChange={(event) => setVacationMessage(event.target.value)}
                    rows={4}
                    placeholder="Ich bin aktuell nicht erreichbar und melde mich, sobald ich wieder da bin."
                  />
                  <span className="settings-field-hint">
                    Wird pro Absender höchstens einmal pro Tag automatisch verschickt.
                  </span>
                </label>
              )}

              <footer className="settings-form-footer">
                <button className="primary-button" type="submit" disabled={isSavingRouting}>
                  {isSavingRouting ? "Speichert…" : "Speichern"}
                </button>
              </footer>
            </form>

            <section className="settings-section">
              <div className="settings-section-heading">
                <h2>Vorlagen / Schnellantworten</h2>
                <p>Wiederverwendbare Textbausteine, die du beim Verfassen per Klick einfügen kannst.</p>
              </div>

              {templateError && (
                <div className="inline-message error" role="status" aria-live="polite">
                  {templateError}
                </div>
              )}

              <div className="template-list">
                {templates.length === 0 && <p className="settings-field-hint">Noch keine Vorlagen.</p>}

                {templates.map((template) => (
                  <div className="template-row" key={template.id}>
                    {editingTemplateId === template.id ? (
                      <input
                        autoFocus
                        defaultValue={template.name}
                        onBlur={(event) => handleRenameTemplate(template.id, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
                          if (event.key === "Escape") setEditingTemplateId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-button template-name"
                        onClick={() => setEditingTemplateId(template.id)}
                        title="Umbenennen"
                      >
                        {template.name}
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      aria-label={`Vorlage "${template.name}" löschen`}
                      title="Löschen"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <form className="template-create-form" onSubmit={handleAddTemplate}>
                <input
                  value={newTemplateName}
                  onChange={(event) => setNewTemplateName(event.target.value)}
                  placeholder="Name, z. B. Terminbestätigung"
                />
                <textarea
                  value={newTemplateBody}
                  onChange={(event) => setNewTemplateBody(event.target.value)}
                  rows={3}
                  placeholder="Text der Vorlage…"
                />
                <button className="ghost-button" type="submit">
                  Vorlage hinzufügen
                </button>
              </form>
            </section>
          </>
        )}
      </article>
    </main>
  );
}
