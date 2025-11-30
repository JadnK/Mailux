import React, { useState, useEffect } from 'react';
import { mailAPI } from '../api/mail';
import { settingsApi } from '../api/settings';

import type { UserSettings } from '../api/settings';

interface SendMailFormProps {
  token: string;
  username: string;
  onMailSent?: () => void;
}

const SendMailForm: React.FC<SendMailFormProps> = ({ token, username, onMailSent }) => {
  const [formData, setFormData] = useState({ to: '', subject: '', text: '', html: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    signature: '',
    canReceiveMails: true,
    vacationMode: false,
    vacationMessage: ''
  });
  const [settingsLoading, setLoadingSettings] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, [username, token]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      console.log("User: ", username);
      const userSettings = await settingsApi.getUserSettings(username!, token);
      console.log(userSettings)
      setSettings(userSettings);
      
      // Initialize form with signature
      setFormData(prev => ({
        ...prev,
        text: userSettings.signature ? `\n\n--\n${userSettings.signature}` : ''
      }));
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await mailAPI.sendMail(formData);
      setSuccess(true);
      
      // Reset form with signature
      setFormData({ to: '', subject: '', text: settings.signature ? `\n\n--\n${settings.signature}` : '', html: '' });
      
      if (onMailSent) onMailSent();
    } catch (err) {
      console.error('Error sending mail:', err);
      setError('Failed to send email. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">Compose Email</h2>
        
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' ? 'alert-success' : 'alert-error'
          }`}>
            {message.text}
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="form-label">
              To
            </label>
            <input
              type="email"
              name="to"
              value={formData.to}
              onChange={handleChange}
              required
              placeholder="test@jadenk.de"
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="Email subject"
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              Message
            </label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleChange}
              required
              rows={8}
              className="form-input resize-none"
              placeholder="Write your message here..."
            />
            {settings.signature && (
              <p className="text-xs text-gray-500 mt-1">
                Your signature will be automatically added at the end of the message.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:bg-purple-800"
            >
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendMailForm;