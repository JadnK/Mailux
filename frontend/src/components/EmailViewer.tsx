import { useEffect, useRef } from 'react';

interface EmailViewerProps {
  html: string;
  text: string;
  className?: string;
}

const EmailViewer = ({ html, text, className = '' }: EmailViewerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDoc) return;

    // Create a safe HTML document with proper styling
    const safeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              color: #e5e7eb;
              background-color: transparent;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            
            /* Reset common email styles */
            img {
              max-width: 100%;
              height: auto;
              display: block;
            }
            
            table {
              border-collapse: collapse;
              width: 100%;
            }
            
            td, th {
              border: 1px solid #374151;
              padding: 8px;
              text-align: left;
            }
            
            a {
              color: #a78bfa;
              text-decoration: none;
            }
            
            a:hover {
              text-decoration: underline;
            }
            
            blockquote {
              border-left: 4px solid #4b5563;
              margin: 16px 0;
              padding-left: 16px;
              color: #9ca3af;
            }
            
            pre {
              background-color: #1f2937;
              color: #f3f4f6;
              padding: 16px;
              border-radius: 6px;
              overflow-x: auto;
              margin: 16px 0;
            }
            
            code {
              background-color: #1f2937;
              color: #f3f4f6;
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 0.9em;
            }
            
            h1, h2, h3, h4, h5, h6 {
              color: #f3f4f6;
              margin-top: 24px;
              margin-bottom: 16px;
              font-weight: 600;
            }
            
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            h4 { font-size: 1.1em; }
            h5 { font-size: 1em; }
            h6 { font-size: 0.9em; }
            
            p {
              margin-bottom: 16px;
            }
            
            ul, ol {
              margin-bottom: 16px;
              padding-left: 24px;
            }
            
            li {
              margin-bottom: 4px;
            }
            
            hr {
              border: none;
              border-top: 1px solid #374151;
              margin: 24px 0;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(safeHtml);
    iframeDoc.close();

    // Set iframe height to match content
    const updateHeight = () => {
      if (iframeDoc?.body) {
        iframe.style.height = `${iframeDoc.body.scrollHeight + 32}px`;
      }
    };

    // Update height after content loads
    iframe.onload = updateHeight;
    
    // Also update height after a short delay to ensure content is rendered
    setTimeout(updateHeight, 100);

    // Cleanup
    return () => {
      iframe.onload = null;
    };
  }, [html]);

  // If there's no HTML content, fall back to text
  if (!html || html.trim() === '') {
    return (
      <div className={`text-gray-400 whitespace-pre-line text-sm ${className}`}>
        {text}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <iframe
        ref={iframeRef}
        className="w-full border-0 bg-transparent"
        style={{
          minHeight: '200px',
          backgroundColor: 'transparent'
        }}
        sandbox="allow-same-origin"
        title="Email content"
      />
    </div>
  );
};

export default EmailViewer;