// Globale Backend-Einstellungen
interface GlobalSettings {
  defaultSignature: string;
  maxStorageMB: number;
  allowExternalEmails: boolean;
  mailServerHost: string;
  mailServerPort: number;
}

interface UserOverrides {
  [username: string]: Partial<GlobalSettings>;
}

// Default Settings
let globalSettings: GlobalSettings = {
  defaultSignature: "Sent with Mailux",
  maxStorageMB: 1024,
  allowExternalEmails: true,
  mailServerHost: "localhost",
  mailServerPort: 587,
};

const userOverrides: UserOverrides = {};

export const getGlobalSettings = (): GlobalSettings => globalSettings;

export const updateGlobalSettings = (updates: Partial<GlobalSettings>): GlobalSettings => {
  globalSettings = { ...globalSettings, ...updates };
  return globalSettings;
};

export const getUserSettings = (username: string): GlobalSettings => {
  return { ...globalSettings, ...(userOverrides[username] || {}) };
};

export const updateUserSettings = (username: string, updates: Partial<GlobalSettings>): GlobalSettings => {
  if (!userOverrides[username]) userOverrides[username] = {};
  userOverrides[username] = { ...userOverrides[username], ...updates };
  return getUserSettings(username);
};
