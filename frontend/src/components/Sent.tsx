import React, { useState, useEffect } from 'react';
import { mailAPI } from '../api/mail';
import type { Mail } from '../types/mail';

interface SentProps {
  token: string;
}

const Sent: React.FC<SentProps> = ({ token }) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchMails = async () => {
      try {
        setLoading(true);
        const data = await mailAPI.getSent();
        setMails(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching sent mails:', err);
        setError('Failed to load sent emails. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

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

  const handleDelete = async (mail: Mail) => {
    if (!mail.uid) return;

    try {
      setDeletingId(mail.uid);
      await mailAPI.deleteMail('Sent', mail.uid);
      
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
          onClick={() => window.location.reload()}
          className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-purple-400">Sent</h2>
      {mails.length === 0 ? (
        <div className="bg-gray-850 rounded-lg p-8 text-center">
          <p className="text-gray-500">No sent emails</p>
        </div>
      ) : (
        <div className="bg-gray-850 shadow rounded-lg overflow-hidden divide-y divide-gray-700">
          {mails.map((mail, index) => {
            const isExpanded = index === expandedIndex;
            
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
                      <h3 className="text-sm font-medium text-purple-300">To: {mail.to}</h3>
                      <span className="text-xs text-gray-500">{formatDateTime(mail.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-200 mb-1">{mail.subject}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {mail.text.substring(0, 100)}{mail.text.length > 100 ? '...' : ''}
                    </p>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    <div className="text-gray-400 whitespace-pre-line text-sm bg-gray-900 p-3 rounded">
                      {mail.text}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDelete(mail)}
                        disabled={deletingId === mail.uid}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === mail.uid ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Sent;