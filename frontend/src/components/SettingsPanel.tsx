import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  changeMyPassword,
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

type VacationPreset = {
  label: string;
  hint: string;
  subject: string;
  message: string;
};

const VACATION_PRESETS: VacationPreset[] = [
  {
    label: "Abwesenheitsnotiz",
    hint: "Für Urlaub oder längere Abwesenheit",
    subject: "Automatische Antwort: Abwesenheit",
    message:
      "Hallo,\n\nvielen Dank für deine Nachricht. Ich bin aktuell nicht erreichbar und melde mich nach meiner Rückkehr bei dir.\n\nViele Grüße",
  },
  {
    label: "Geschäftlich - Anfrage bestätigen",
    hint: "Für Kundenanfragen, Support, Bestellungen",
    subject: "Vielen Dank für deine Anfrage",
    message:
      "Hallo,\n\nvielen Dank für deine Anfrage! Wir haben sie erhalten und melden uns in Kürze bei dir.\n\nViele Grüße\nDein Team",
  },
];

function SectionIcon({ path }: { path: string }) {
  return (
    <span className="settings-section-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </span>
  );
}

const ICON_PROFILE = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z";
const ICON_STORAGE = "M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2Zm0 0v12c0 1.1 3.6 2 8 2s8-.9 8-2V6M4 12c0 1.1 3.6 2 8 2s8-.9 8-2";
const ICON_ROUTING = "M17 8V4l5 5-5 5V10c-6 0-8 2-9 6-1-4.5.5-10.5 9-10.5V8Z";
const ICON_TEMPLATES = "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM9 13h6M9 17h6M9 9h1";
const ICON_LOCK = "M6 11V8a6 6 0 0 1 12 0v3M5 11h14v9H5v-9Zm7 4v2";

export function SettingsPanel({ session, onSettingsChange }: SettingsPanelProps) {
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [forwardingAddress, setForwardingAddress] = useState("");
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationSubject, setVacationSubject] = useState("");
  const [vacationMessage, setVacationMessage] = useState("");
  const [vacationStart, setVacationStart] = useState("");
  const [vacationEnd, setVacationEnd] = useState("");
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const [data, usageData, templateData] = await Promise.all([
          getMySettings(session),
          session.hasMailbox ? getMyUsage(session).catch(() => null) : Promise.resolve(null),
          session.hasMailbox ? getMyTemplates(session).catch(() => []) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setName(data.name);
        setSignature(data.signature);
        setForwardingAddress(data.forwardingAddress ?? "");
        setVacationMode(data.vacationMode);
        setVacationSubject(data.vacationSubject ?? "");
        setVacationMessage(data.vacationMessage ?? "");
        setVacationStart(data.vacationStart ?? "");
        setVacationEnd(data.vacationEnd ?? "");
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

  function applyPreset(preset: VacationPreset) {
    setVacationMode(true);
    setVacationSubject(preset.subject);
    setVacationMessage(preset.message);
    setRoutingNotice("");
    setRoutingError("");
  }

  async function handleSaveRouting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoutingError("");
    setRoutingNotice("");

    if (vacationStart && vacationEnd && vacationStart > vacationEnd) {
      setRoutingError("Der Start der Abwesenheit muss vor dem Ende liegen.");
      return;
    }

    setIsSavingRouting(true);

    try {
      const updated = await updateMySettings(session, {
        forwardingAddress: forwardingAddress.trim() || null,
        vacationMode,
        vacationSubject,
        vacationMessage,
        vacationStart: vacationStart || null,
        vacationEnd: vacationEnd || null,
      });
      setForwardingAddress(updated.forwardingAddress ?? "");
      setVacationMode(updated.vacationMode);
      setVacationSubject(updated.vacationSubject ?? "");
      setVacationMessage(updated.vacationMessage ?? "");
      setVacationStart(updated.vacationStart ?? "");
      setVacationEnd(updated.vacationEnd ?? "");
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

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");

    if (newPassword.length < 8) {
      setPasswordError("Neues Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeMyPassword(session, currentPassword, newPassword);
      setPasswordNotice("Passwort geändert.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Passwort konnte nicht geändert werden");
    } finally {
      setIsChangingPassword(false);
    }
  }

  const usagePercent =
    usage && usage.limitBytes > 0 ? Math.min(100, (usage.usedBytes / usage.limitBytes) * 100) : null;

  return (
    <main className="reader-panel">
      <header className="reader-header">
        <div>
          <h1>Einstellungen</h1>
          <p>
            {session.hasMailbox
              ? "Dein Profil, wie es beim Versenden von Mails angezeigt wird, plus Konto-Optionen."
              : "Konto-Optionen für diesen Admin-Zugang - ohne eigene Mailbox gibt es hier nur das Passwort zu verwalten."}
          </p>
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
            {!session.hasMailbox && (
              <div className="settings-card settings-no-mailbox-notice">
                <SectionIcon path={ICON_PROFILE} />
                <div>
                  <strong>Keine Mailbox eingerichtet</strong>
                  <p className="settings-field-hint">
                    Dieser Account hat sudo-Rechte, aber kein Postfach in Postfix/Dovecot - daher
                    gibt es kein Profil, keine Weiterleitung und keine Vorlagen zu konfigurieren.
                    Eine Mailbox lässt sich unter „Verwaltung" anlegen.
                  </p>
                </div>
              </div>
            )}

            {session.hasMailbox && (
              <form className="settings-card settings-form" onSubmit={handleSave}>
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

            {session.hasMailbox && usage && (
              <section className="settings-card usage-section">
                <div className="settings-section-heading">
                  <SectionIcon path={ICON_STORAGE} />
                  <div>
                    <h2>Speicherplatz</h2>
                    <p>Wie viel Platz dein Postfach aktuell belegt.</p>
                  </div>
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

            {session.hasMailbox && (
              <form className="settings-card settings-form" onSubmit={handleSaveRouting}>
                <div className="settings-section-heading">
                  <SectionIcon path={ICON_ROUTING} />
                  <div>
                    <h2>Weiterleitung &amp; Autoresponder</h2>
                    <p>
                      Mails bleiben immer zusätzlich in diesem Postfach - beides wirkt sofort auf
                      neu eintreffende Mails, auch wenn du gerade nicht angemeldet bist.
                    </p>
                  </div>
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

                <div className="settings-subsection-divider" />

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={vacationMode}
                    onChange={(event) => setVacationMode(event.target.checked)}
                  />
                  Automatische Antwort senden
                </label>

                {vacationMode && (
                  <>
                    <div className="settings-preset-row">
                      {VACATION_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="preset-button"
                          onClick={() => applyPreset(preset)}
                          title={preset.hint}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <label>
                      Betreff der Antwort
                      <input
                        value={vacationSubject}
                        onChange={(event) => setVacationSubject(event.target.value)}
                        placeholder="z. B. Automatische Antwort: Abwesenheit"
                      />
                    </label>

                    <label>
                      Text der automatischen Antwort
                      <textarea
                        value={vacationMessage}
                        onChange={(event) => setVacationMessage(event.target.value)}
                        rows={5}
                        placeholder={
                          "Hallo,\n\nvielen Dank für deine Nachricht. Ich bin aktuell nicht erreichbar " +
                          "und melde mich, sobald ich wieder da bin.\n\nViele Grüße"
                        }
                      />
                      <span className="settings-field-hint">
                        Wird pro Absender höchstens einmal pro Tag automatisch verschickt.
                      </span>
                    </label>

                    <div className="settings-date-row">
                      <label>
                        Von (optional)
                        <input
                          type="date"
                          value={vacationStart}
                          onChange={(event) => setVacationStart(event.target.value)}
                        />
                      </label>
                      <label>
                        Bis (optional)
                        <input
                          type="date"
                          value={vacationEnd}
                          onChange={(event) => setVacationEnd(event.target.value)}
                        />
                      </label>
                    </div>
                    <span className="settings-field-hint">
                      Ohne Datum gilt die automatische Antwort unbegrenzt, solange sie aktiv ist.
                    </span>
                  </>
                )}

                <footer className="settings-form-footer">
                  <button className="primary-button" type="submit" disabled={isSavingRouting}>
                    {isSavingRouting ? "Speichert…" : "Speichern"}
                  </button>
                </footer>
              </form>
            )}

            {session.hasMailbox && (
              <section className="settings-card">
                <div className="settings-section-heading">
                  <SectionIcon path={ICON_TEMPLATES} />
                  <div>
                    <h2>Vorlagen / Schnellantworten</h2>
                    <p>Wiederverwendbare Textbausteine, die du beim Verfassen per Klick einfügen kannst.</p>
                  </div>
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
            )}

            <form className="settings-card settings-form" onSubmit={handleChangePassword}>
              <div className="settings-section-heading">
                <SectionIcon path={ICON_LOCK} />
                <div>
                  <h2>Passwort ändern</h2>
                  <p>Gilt für Login, IMAP und SMTP - das ist dein normales Konto-Passwort.</p>
                </div>
              </div>

              {(passwordError || passwordNotice) && (
                <div
                  className={passwordError ? "inline-message error" : "inline-message success"}
                  role="status"
                  aria-live="polite"
                >
                  {passwordError || passwordNotice}
                </div>
              )}

              <label>
                Aktuelles Passwort
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>

              <div className="settings-date-row">
                <label>
                  Neues Passwort
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="mind. 8 Zeichen"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label>
                  Neues Passwort bestätigen
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="mind. 8 Zeichen"
                    autoComplete="new-password"
                    required
                  />
                </label>
              </div>

              <footer className="settings-form-footer">
                <button className="primary-button" type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? "Ändert…" : "Passwort ändern"}
                </button>
              </footer>
            </form>
          </>
        )}
      </article>
    </main>
  );
}
