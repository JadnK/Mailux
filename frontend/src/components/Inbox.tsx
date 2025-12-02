import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { mailAPI } from '../api/mail';
import type { Mail } from '../types/mail';
import EmailViewer from './EmailViewer';

interface InboxProps {
  token: string;
}

export interface InboxRef {
  fetchMails: () => Promise<void>;
}

const Inbox = forwardRef<InboxRef, InboxProps>(({ token }, ref) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchMails = async () => {
    try {
      setLoading(true);
      const data = await mailAPI.getInbox();
      setMails(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching inbox:', err);
      setError('Failed to load inbox. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchMails
  }));

  useEffect(() => {
    if (token) fetchMails();
  }, [token]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReply = async (mail: Mail) => {
    if (!replyContent.trim()) return;

    try {
      const replyData = {
        to: mail.from,
        subject: `Re: ${mail.subject}`,
        text: replyContent,
        html: replyContent.replace(/\n/g, '<br>')
      };

      await mailAPI.replyMail(replyData);
      setReplyingTo(null);
      setReplyContent('');
      setExpandedIndex(null);
      
      // Refresh mails
      await fetchMails();
    } catch (err) {
      console.error('Error replying to mail:', err);
      setError('Failed to send reply. Please try again.');
    }
  };

  const handleDelete = async (mail: Mail) => {
    if (!mail.uid) return;

    try {
      setDeletingId(mail.uid);
      await mailAPI.deleteMail('INBOX', mail.uid);
      
      // Remove from local state
      setMails(prev => prev.filter(m => m.uid !== mail.uid));
      setExpandedIndex(null);
    } catch (err) {
      console.error('Error deleting mail:', err);
      setError('Failed to delete mail. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-850 border border-red-700 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchMails}
          disabled={loading}
          className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <h2 className="text-2xl font-bold text-purple-400">Inbox</h2>
        <div className="text-sm text-gray-500">
          {mails.length} {mails.length === 1 ? 'email' : 'emails'}
        </div>
      </div>
      {mails.length === 0 ? (
        <div className="bg-gray-850 rounded-lg p-8 text-center">
          <p className="text-gray-500">No emails in your inbox</p>
        </div>
      ) : (
        <div className="bg-gray-850 shadow rounded-lg overflow-hidden divide-y divide-gray-700">
          {mails.map((mail, index) => {
            const isExpanded = index === expandedIndex;
            const isReplying = replyingTo === index;
            
            return (
              <div
                key={index}
                className="p-4 hover:bg-gray-800 transition-colors duration-150"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() =>
                    setExpandedIndex(isExpanded ? null : index)
                  }>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-purple-300">{mail.from}</h3>
                      <span className="text-xs text-gray-500">{formatDateTime(mail.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-200 mb-1">{mail.subject}</p>
                    {/* <p className="text-xs text-gray-400 line-clamp-1">
                      {mail.text.substring(0, 100)}{mail.text.length > 100 ? '...' : ''}
                    </p> */}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    <EmailViewer 
                      html={mail.html} 
                      text={mail.text}
                      className="text-sm bg-gray-900 rounded"
                    />
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setReplyingTo(isReplying ? null : index)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        {isReplying ? 'Cancel' : 'Reply'}
                      </button>
                      <button
                        onClick={() => handleDelete(mail)}
                        disabled={deletingId === mail.uid}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === mail.uid ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>

                    {/* Reply Form */}
                    {isReplying && (
                      <div className="bg-gray-900 p-4 rounded space-y-3">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Type your reply..."
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          rows={4}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReply(mail)}
                            disabled={!replyContent.trim()}
                            className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                          >
                            Send Reply
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default Inbox;