import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import {
  getMySettings,
  removeMyAvatar,
  updateMySettings,
  uploadMyAvatar,
} from "../api/mailClient";
import type { Session, UserSettings } from "../types/mail";
import { initialsOf } from "../utils/text";

type SettingsPanelProps = {
  session: Session;
  /** Called whenever settings change, so the sidebar avatar/name stay in sync. */
  onSettingsChange?: (settings: UserSettings) => void;
};

/**
 * Downscales an image file client-side before upload - an avatar never
 * needs to be larger than this, and doing it in the browser means we never
 * have to accept (or store, in a single shared JSON config file) a full
 * multi-megabyte photo straight from someone's phone.
 */
async function resizeImage(file: File, maxDimension = 320, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas wird von diesem Browser nicht unterstützt");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  if (!blob) throw new Error("Bild konnte nicht verarbeitet werden");
  return blob;
}

export function SettingsPanel({ session, onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getMySettings(session);
        if (cancelled) return;
        setSettings(data);
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

  function applySettings(next: UserSettings) {
    setSettings(next);
    onSettingsChange?.(next);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);

    try {
      const updated = await updateMySettings(session, { name, signature });
      applySettings(updated);
      setNotice("Gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setNotice("");
    setIsUploadingAvatar(true);

    try {
      const resized = await resizeImage(file);
      const updated = await uploadMyAvatar(session, resized);
      applySettings(updated);
      setNotice("Profilbild aktualisiert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profilbild konnte nicht hochgeladen werden");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setError("");
    setNotice("");

    try {
      const updated = await removeMyAvatar(session);
      applySettings(updated);
      setNotice("Profilbild entfernt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profilbild konnte nicht entfernt werden");
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
          <>
            <section className="settings-avatar-row">
              <span className="settings-avatar">
                {settings?.profilePicture ? (
                  <img src={settings.profilePicture} alt="Profilbild" />
                ) : (
                  initialsOf(name || session.username)
                )}
              </span>

              <div className="settings-avatar-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? "Lädt hoch…" : "Bild ändern"}
                </button>
                {settings?.profilePicture && (
                  <button type="button" className="text-button" onClick={handleRemoveAvatar}>
                    Entfernen
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="compose-attach-input"
                  onChange={handleAvatarSelected}
                />
                <p className="settings-hint">JPG oder PNG, wird automatisch verkleinert.</p>
              </div>
            </section>

            <form className="settings-form" onSubmit={handleSave}>
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
          </>
        )}
      </article>
    </main>
  );
}
