import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react';
import { mailAPI } from '../api/mail';
import type { Mail } from '../types/mail';
import EmailViewer from './EmailViewer';

interface InboxProps { token: string; }
export interface InboxRef { fetchMails: () => Promise<void>; }

type Status = 'loading' | 'ready' | 'error';

const initials = (value: string) =>
  (value || '?').replace(/<.*?>/g, '').trim().slice(0, 2).toUpperCase() || '?';

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString || 'Unknown date';
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const preview = (mail: Mail) =>
  (mail.text || mail.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const Inbox = forwardRef<InboxRef, InboxProps>(({ token }, ref) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const fetchMails = async () => {
    try {
      setStatus('loading');
      const data = await mailAPI.getInbox();
      setMails(data);
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('Error fetching inbox:', err);
      setError('Inbox konnte nicht geladen werden. Bitte Verbindung prüfen und erneut versuchen.');
      setStatus('error');
    }
  };

  useImperativeHandle(ref, () => ({ fetchMails }));
  useEffect(() => { if (token) fetchMails(); }, [token]);

  const filteredMails = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mails;
    return mails.filter((mail) => [mail.from, mail.subject, mail.text].some((value) => value?.toLowerCase().includes(needle)));
  }, [mails, query]);

  const handleReply = async (mail: Mail) => {
    if (!replyContent.trim()) return;
    try {
      await mailAPI.replyMail({
        to: mail.from,
        subject: mail.subject?.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`,
        text: replyContent,
        html: replyContent.replace(/\n/g, '<br />'),
      });
      setReplyingTo(null);
      setReplyContent('');
      setExpandedIndex(null);
      await fetchMails();
    } catch (err) {
      console.error('Error replying to mail:', err);
      setError('Antwort konnte nicht gesendet werden.');
      setStatus('error');
    }
  };

  const handleDelete = async (mail: Mail) => {
    if (!mail.uid) return;
    try {
      setDeletingId(mail.uid);
      await mailAPI.deleteMail('INBOX', mail.uid);
      setMails((prev) => prev.filter((m) => m.uid !== mail.uid));
      setExpandedIndex(null);
    } catch (err) {
      console.error('Error deleting mail:', err);
      setError('Mail konnte nicht gelöscht werden.');
      setStatus('error');
    } finally {
      setDeletingId(null);
    }
  };

  if (status === 'loading') {
    return <div className="flex h-80 items-center justify-center"><div className="mx-spinner" /></div>;
  }

  if (status === 'error') {
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
            <span className="mx-pill">Inbox · {mails.length} Mails</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white">Eingang</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Schneller Überblick, fokussierte Mail-Karten und eine deutlich hochwertigere Vorschau.</p>
          </div>
          <div className="w-full lg:w-80">
            <label className="sr-only" htmlFor="mail-search">Search</label>
            <input id="mail-search" className="mx-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sender, subject, content..." />
          </div>
        </div>
      </div>

      {filteredMails.length === 0 ? (
        <div className="mx-card p-12 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06] text-3xl">✉️</div>
          <h3 className="text-xl font-bold text-white">Keine Mails gefunden</h3>
          <p className="mt-2 text-sm text-slate-400">{query ? 'Passe deine Suche an.' : 'Dein Posteingang ist aktuell leer.'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMails.map((mail, index) => {
            const sourceIndex = mails.indexOf(mail);
            const isExpanded = sourceIndex === expandedIndex;
            const isReplying = replyingTo === sourceIndex;
            const mailPreview = preview(mail);

            return (
              <article key={mail.uid ?? `${mail.from}-${mail.date}-${index}`} className={`mx-card overflow-hidden transition ${isExpanded ? 'ring-1 ring-violet-300/40' : 'hover:border-white/20'}`}>
                <button type="button" className="grid w-full gap-4 p-5 text-left sm:grid-cols-[auto_1fr_auto] sm:items-center" onClick={() => setExpandedIndex(isExpanded ? null : sourceIndex)}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/90 to-cyan-400/80 text-sm font-black text-white shadow-lg shadow-violet-950/30">{initials(mail.from)}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-slate-100">{mail.from}</h3>
                      <span className="mx-pill !px-2 !py-0.5">received</span>
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
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => setReplyingTo(isReplying ? null : sourceIndex)} className="mx-btn-secondary">{isReplying ? 'Cancel reply' : 'Reply'}</button>
                      <button type="button" onClick={() => handleDelete(mail)} disabled={deletingId === mail.uid} className="mx-btn-danger">{deletingId === mail.uid ? 'Deleting...' : 'Delete'}</button>
                    </div>
                    {isReplying && (
                      <div className="mt-5 mx-card-soft p-4">
                        <label className="mx-label">Antwort an {mail.from}</label>
                        <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Schreibe deine Antwort..." className="mx-textarea" rows={5} />
                        <div className="mt-4 flex flex-wrap justify-end gap-3">
                          <button type="button" onClick={() => { setReplyingTo(null); setReplyContent(''); }} className="mx-btn-secondary">Cancel</button>
                          <button type="button" onClick={() => handleReply(mail)} disabled={!replyContent.trim()} className="mx-btn-primary">Send Reply</button>
                        </div>
                      </div>
                    )}
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

export default Inbox;
