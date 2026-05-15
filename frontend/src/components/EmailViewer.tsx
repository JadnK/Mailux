import { useMemo, useRef, useState } from 'react';

interface EmailViewerProps {
  html: string;
  text: string;
  className?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildDocument = (html: string, text: string) => {
  const body = html?.trim()
    ? html
    : `<pre class="mailux-plain-text">${escapeHtml(text || 'No content')}</pre>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px;
    color: #dbeafe;
    background:
      radial-gradient(circle at 12% 4%, rgba(139, 92, 246, .12), transparent 22rem),
      linear-gradient(180deg, rgba(15, 23, 42, .94), rgba(2, 6, 23, .96));
    font: 15px/1.72 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    overflow-wrap: anywhere;
  }
  img { max-width: 100%; height: auto; border-radius: 16px; }
  a { color: #67e8f9; text-decoration: none; border-bottom: 1px solid rgba(103,232,249,.35); }
  a:hover { border-bottom-color: currentColor; }
  table { max-width: 100%; width: auto; border-collapse: collapse; background: rgba(15,23,42,.55); border-radius: 14px; overflow: hidden; }
  td, th { border: 1px solid rgba(148,163,184,.18); padding: 10px 12px; vertical-align: top; }
  blockquote { margin: 20px 0; padding: 14px 18px; border-left: 4px solid #8b5cf6; background: rgba(139,92,246,.08); color: #cbd5e1; border-radius: 0 14px 14px 0; }
  pre, code { background: rgba(2,6,23,.7); border: 1px solid rgba(148,163,184,.15); border-radius: 12px; color: #e2e8f0; }
  pre { overflow-x: auto; padding: 16px; white-space: pre-wrap; }
  code { padding: 2px 6px; }
  h1,h2,h3,h4,h5,h6 { color: #f8fafc; line-height: 1.2; margin: 1.2em 0 .65em; }
  p { margin: 0 0 1em; }
  hr { border: 0; border-top: 1px solid rgba(148,163,184,.18); margin: 24px 0; }
  .mailux-plain-text { margin: 0; white-space: pre-wrap; font-family: inherit; line-height: 1.8; }
</style>
</head>
<body>${body}</body>
</html>`;
};

const EmailViewer = ({ html, text, className = '' }: EmailViewerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [height, setHeight] = useState(280);
  const hasHtml = Boolean(html?.trim());

  const srcDoc = useMemo(() => buildDocument(html, text), [html, text]);

  const updateHeight = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    setHeight(Math.min(Math.max(doc.body.scrollHeight + 24, 280), 1200));
  };

  return (
    <section className={`mx-card overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.035] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200/80">Mail Preview</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">Sichere Vorschau im isolierten Frame</h3>
        </div>
        <div className="flex rounded-2xl border border-white/10 bg-slate-950/55 p-1">
          <button
            type="button"
            onClick={() => setShowRaw(false)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${!showRaw ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Rendered
          </button>
          <button
            type="button"
            onClick={() => setShowRaw(true)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${showRaw ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Text
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="max-h-[680px] overflow-auto whitespace-pre-wrap p-6 text-sm leading-7 text-slate-300">
          {text || (hasHtml ? 'Diese Mail enthält nur HTML-Inhalt.' : 'Kein Inhalt vorhanden.')}
        </pre>
      ) : (
        <iframe
          ref={iframeRef}
          className="block w-full border-0 bg-transparent"
          style={{ height }}
          srcDoc={srcDoc}
          onLoad={updateHeight}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          title="Email content"
        />
      )}
    </section>
  );
};

export default EmailViewer;
