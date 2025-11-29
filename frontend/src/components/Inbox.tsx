import React, { useState, useEffect } from 'react';
import { mailAPI } from '../api/mail';
import type { Mail } from '../types/mail';

interface InboxProps {
  token: string;
}

const Inbox: React.FC<InboxProps> = ({ token }) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
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

    if (token) fetchMails();
  }, [token]);

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
      <h2 className="text-2xl font-bold text-purple-400">Inbox</h2>
      {mails.length === 0 ? (
        <div className="bg-gray-850 rounded-lg p-8 text-center">
          <p className="text-gray-500">No emails in your inbox</p>
        </div>
      ) : (
        <div className="bg-gray-850 shadow rounded-lg overflow-hidden divide-y divide-gray-700">
          {mails.map((mail, index) => {
            const isExpanded = index === expandedIndex;
            return (
              <div
                key={index}
                className="p-4 hover:bg-gray-800 transition-colors duration-150 cursor-pointer"
                onClick={() =>
                  setExpandedIndex(isExpanded ? null : index)
                }
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-purple-300">{mail.from}</h3>
                      <span className="text-xs text-gray-500">{new Date(mail.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-200 mb-1">{mail.subject}</p>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-2 text-gray-400 whitespace-pre-line text-sm">
                    {mail.text}
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

export default Inbox;
