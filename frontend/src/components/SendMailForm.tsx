import React, { useState } from 'react';
import { mailAPI } from '../api/mail';

interface SendMailFormProps {
  token: string;
  onMailSent?: () => void;
}

const SendMailForm: React.FC<SendMailFormProps> = ({ token, onMailSent }) => {
  const [formData, setFormData] = useState({ to: '', subject: '', text: '', html: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await mailAPI.sendMail(formData);
      setSuccess(true);
      setFormData({ to: '', subject: '', text: '', html: '' });
      if (onMailSent) onMailSent();
    } catch (err) {
      console.error('Error sending mail:', err);
      setError('Failed to send email. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-850 shadow rounded-lg p-6">
      <h2 className="text-xl font-bold text-purple-400 mb-4">Compose Email</h2>

      {success && (
        <div className="bg-purple-900 border border-purple-700 rounded-lg p-4 mb-4">
          <p className="text-purple-300">Email sent successfully!</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400">To</label>
          <input
            type="email"
            name="to"
            value={formData.to}
            onChange={handleChange}
            required
            placeholder="recipient@example.com"
            className="mt-1 block w-full rounded-md bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400">Subject</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            placeholder="Email subject"
            className="mt-1 block w-full rounded-md bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400">Message</label>
          <textarea
            name="text"
            value={formData.text}
            onChange={handleChange}
            required
            rows={6}
            placeholder="Write your message here..."
            className="mt-1 block w-full rounded-md bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendMailForm;
