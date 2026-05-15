import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { mailAPI } from '../api/mail';
import type { Mail } from '../types/mail';
import EmailViewer from './EmailViewer';

interface SentProps { token: string; }
export interface SentRef { fetchMails: () => Promise<void>; }

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString || 'Unknown date';
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const initials = (value: string) => (value || '?').replace(/<.*?>/g, '').trim().slice(0, 2).toUpperCase() || '?';
const preview = (mail: Mail) => (mail.text || mail.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const Sent = forwardRef<SentRef, SentProps>(({ token }, ref) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const fetchMails = async () => {
    try {
      setLoading(true);
      const data = await mailAPI.getSent();
      setMails(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching sent mails:', err);
      setError('Gesendete Mails konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ fetchMails }));
  useEffect(() => { if (token) fetchMails(); }, [token]);

  const filteredMails = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mails;
    return mails.filter((mail) => [mail.to, mail.subject, mail.text].some((value) => value?.toLowerCase().includes(needle)));
  }, [mails, query]);

  const handleDelete = async (mail: Mail) => {
    if (!mail.uid) return;
    try {
      setDeletingId(mail.uid);
      await mailAPI.deleteMail('Sent', mail.uid);
      setMails((prev) => prev.filter((m) => m.uid !== mail.uid));
      setExpandedIndex(null);
    } catch (err) {
      console.error('Error deleting mail:', err);
      setError('Mail konnte nicht gelöscht werden.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="flex h-80 items-center justify-center"><div className="mx-spinner" /></div>;

  if (error) {
    return (
      <div className="mx-card p-6">
        <p className="mx-alert-error">{error}</p>
        <button onClick={fetchMails} className="mx-btn-primary mt-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="mx-pill">Sent · {mails.length} Mails</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Gesendet</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Gesendete Nachrichten mit moderner Timeline-Optik und gleicher Premium-Vorschau.</p>
          </div>
          <div className="w-full lg:w-80">
            <input className="mx-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipient, subject, content..." />
          </div>
        </div>
      </div>

      {filteredMails.length === 0 ? (
        <div className="mx-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06] text-3xl">📤</div>
          <h3 className="text-xl font-bold text-white">Keine gesendeten Mails</h3>
          <p className="mt-2 text-sm text-slate-400">{query ? 'Keine Treffer für deine Suche.' : 'Gesendete Nachrichten erscheinen hier.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMails.map((mail, index) => {
            const sourceIndex = mails.indexOf(mail);
            const isExpanded = sourceIndex === expandedIndex;
            const mailPreview = preview(mail);
            return (
              <article key={mail.uid ?? `${mail.to}-${mail.date}-${index}`} className={`mx-card overflow-hidden transition ${isExpanded ? 'ring-1 ring-cyan-300/40' : 'hover:border-white/20'}`}>
                <button type="button" className="grid w-full gap-4 p-5 text-left sm:grid-cols-[auto_1fr_auto] sm:items-center" onClick={() => setExpandedIndex(isExpanded ? null : sourceIndex)}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/90 to-violet-500/80 text-sm font-black text-white shadow-lg shadow-cyan-950/30">{initials(mail.to)}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-slate-100">To: {mail.to}</h3>
                      <span className="mx-pill !px-2 !py-0.5">sent</span>
                    </div>
                    <p className="mt-1 truncate text-base font-semibold text-white">{mail.subject || '(No subject)'}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-400">{mailPreview || 'No preview available'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-medium text-slate-400">{formatDateTime(mail.date)}</p>
                    <p className="mt-2 text-xs text-cyan-200">{isExpanded ? 'Hide preview ↑' : 'Open preview ↓'}</p>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-white/10 p-5">
                    <EmailViewer html={mail.html} text={mail.text} />
                    <div className="mt-5 flex justify-end">
                      <button type="button" onClick={() => handleDelete(mail)} disabled={deletingId === mail.uid} className="mx-btn-danger">{deletingId === mail.uid ? 'Deleting...' : 'Delete'}</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default Sent;
