import React, { useEffect, useMemo, useState } from 'react';
import { mailAPI } from '../api/mail';
import { settingsApi, type UserSettings } from '../api/settings';
import EmailViewer from './EmailViewer';

interface SendMailFormProps {
  token: string;
  username: string;
  onMailSent?: () => void;
}

const defaultSettings: UserSettings = {
  name: '',
  signature: '',
  canReceiveMails: true,
  vacationMode: false,
  vacationMessage: '',
};

const textToHtml = (value: string) => value.replace(/\n/g, '<br />');

const SendMailForm: React.FC<SendMailFormProps> = ({ token, username, onMailSent }) => {
  const [formData, setFormData] = useState({ to: '', subject: '', text: '', html: '' });
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => { loadSettings(); }, [username, token]);

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const userSettings = await settingsApi.getUserSettings(username, token);
      setSettings(userSettings);
      setFormData((prev) => ({
        ...prev,
        text: userSettings.signature ? `Hallo,\n\n\n${userSettings.signature}` : prev.text,
      }));
    } catch (error) {
      setMessage({ type: 'error', text: 'Settings konnten nicht geladen werden.' });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const effectiveHtml = useMemo(() => formData.html.trim() || textToHtml(formData.text), [formData.html, formData.text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await mailAPI.sendMail({ ...formData, html: effectiveHtml });
      setMessage({ type: 'success', text: 'E-Mail wurde erfolgreich gesendet.' });
      setFormData({ to: '', subject: '', text: settings.signature ? `Hallo,\n\n\n${settings.signature}` : '', html: '' });
      onMailSent?.();
    } catch (err) {
      console.error('Error sending mail:', err);
      setMessage({ type: 'error', text: 'E-Mail konnte nicht gesendet werden. Bitte Verbindung prüfen.' });
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading) return <div className="flex h-80 items-center justify-center"><div className="mx-spinner" /></div>;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
      <section className="mx-card p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mx-pill">Compose · {username}</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Neue Mail</h2>
            <p className="mt-2 text-sm text-slate-400">Schreibe fokussiert, mit sauberer Typografie und Live-Preview.</p>
          </div>
          <button type="button" onClick={() => setShowPreview((value) => !value)} className="mx-btn-secondary xl:hidden">{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
        </div>

        {message && <div className={message.type === 'success' ? 'mx-alert-success mb-5' : 'mx-alert-error mb-5'}>{message.text}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mx-label" htmlFor="to">Empfänger</label>
              <input id="to" name="to" type="email" value={formData.to} onChange={handleChange} required className="mx-input" placeholder="name@example.com" />
            </div>
            <div>
              <label className="mx-label" htmlFor="subject">Betreff</label>
              <input id="subject" name="subject" value={formData.subject} onChange={handleChange} required className="mx-input" placeholder="Worum geht es?" />
            </div>
          </div>

          <div>
            <label className="mx-label" htmlFor="text">Nachricht</label>
            <textarea id="text" name="text" value={formData.text} onChange={handleChange} required className="mx-textarea min-h-[340px]" placeholder="Schreibe deine Nachricht..." />
            {settings.signature && <p className="mt-2 text-xs text-slate-500">Deine Signatur ist bereits eingefügt.</p>}
          </div>

          <details className="mx-card-soft p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">Optional: eigenes HTML verwenden</summary>
            <textarea name="html" value={formData.html} onChange={handleChange} className="mx-textarea mt-4 min-h-40 font-mono text-xs" placeholder="Leer lassen, um automatisch aus dem Text HTML zu erzeugen." />
          </details>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setFormData({ to: '', subject: '', text: settings.signature ? `Hallo,\n\n\n${settings.signature}` : '', html: '' })} className="mx-btn-secondary">Reset</button>
            <button type="submit" disabled={loading || !formData.to || !formData.subject || !formData.text.trim()} className="mx-btn-primary">{loading ? 'Sending…' : 'Send Email'}</button>
          </div>
        </form>
      </section>

      {showPreview && (
        <aside className="xl:sticky xl:top-28 xl:self-start">
          <EmailViewer html={effectiveHtml} text={formData.text || 'Deine Vorschau erscheint hier.'} />
        </aside>
      )}
    </div>
  );
};

export default SendMailForm;
