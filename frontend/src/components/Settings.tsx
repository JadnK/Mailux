import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../api/settings';
import { settingsApi } from '../api/settings';

interface SettingsProps {
  token: string;
  username: string;
}

const Settings: React.FC<SettingsProps> = ({ token, username }) => {
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    signature: '',
    canReceiveMails: true,
    vacationMode: false,
    vacationMessage: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, [username, token]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await settingsApi.getUserSettings(username, token);
      setSettings(userSettings);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsApi.updateUserSettings(username, settings, token);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">Settings</h2>
        
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            message.type === 'success' ? 'alert-success' : 'alert-error'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Name Setting */}
          <div>
            <label className="form-label">
              Display Name
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="form-input"
              placeholder="Enter your display name"
            />
          </div>

          {/* Email Address (read-only) */}
          <div>
            <label className="form-label">
                Email Address
            </label>
            <input
                type="text"
                value={`${username}@jadenk.de`}
                readOnly
                className="form-input bg-gray-800 text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Signature Setting */}
          <div>
            <label className="form-label">
              Email Signature
            </label>
            <textarea
              value={settings.signature}
              onChange={(e) => handleChange('signature', e.target.value)}
              rows={4}
              className="form-input resize-none"
              placeholder="Enter your email signature"
            />
          </div>

          {/* Mail Receive Setting */}
          {/*<div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Receive Emails
              </label>
              <p className="text-sm text-gray-500">
                Allow others to send you emails
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.canReceiveMails}
                onChange={(e) => handleChange('canReceiveMails', e.target.checked)}
                className="sr-only peer"
              />
              <div className="toggle-bg">
                <div className="toggle-dot"></div>
              </div>
            </label>
          </div>*/}

          {/* Vacation Mode Setting */}
          {/*<div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Vacation Mode
              </label>
              <p className="text-sm text-gray-500">
                Automatically respond to emails with vacation message
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.vacationMode}
                onChange={(e) => handleChange('vacationMode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="toggle-bg">
                <div className="toggle-dot"></div>
              </div>
            </label>
          </div>*/}

          {/* Vacation Message */}
          {/*settings.vacationMode && (
            <div>
              <label className="form-label">
                Vacation Message
              </label>
              <textarea
                value={settings.vacationMessage || ''}
                onChange={(e) => handleChange('vacationMessage', e.target.value)}
                rows={3}
                className="form-input resize-none"
                placeholder="Enter your vacation auto-response message"
              />
            </div>
          )*/}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:bg-purple-800"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;