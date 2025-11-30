import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '../../../config.json');

// User Settings Interface
interface UserSettings {
  name: string;
  signature: string;
  canReceiveMails: boolean;
  vacationMode: boolean;
  vacationMessage?: string;
}

// Global Backend-Einstellungen
interface GlobalSettings {
  defaultSignature: string;
  maxStorageMB: number;
}

interface UserOverrides {
  [username: string]: Partial<GlobalSettings>;
}

interface ConfigData {
  globalSettings: GlobalSettings;
  userSettings: { [username: string]: UserSettings };
}

// Load config from file
function loadConfig(): ConfigData {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      // Create default config if it doesn't exist
      const defaultConfig: ConfigData = {
        globalSettings: {
          defaultSignature: "Sent with Mailux",
          maxStorageMB: 1024,
        },
        userSettings: {}
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading config:', error);
    // Return default config on error
    return {
      globalSettings: {
        defaultSignature: "Sent with Mailux",
        maxStorageMB: 1024,
      },
      userSettings: {}
    };
  }
}

// Save config to file
function saveConfig(config: ConfigData): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

// Default Settings
let globalSettings: GlobalSettings = loadConfig().globalSettings;
let userSettings: { [username: string]: UserSettings } = loadConfig().userSettings;

const userOverrides: UserOverrides = {};

export const getGlobalSettings = (): GlobalSettings => {
  const config = loadConfig();
  return config.globalSettings;
};

export const updateGlobalSettings = (updates: Partial<GlobalSettings>): GlobalSettings => {
  const config = loadConfig();
  config.globalSettings = { ...config.globalSettings, ...updates };
  saveConfig(config);
  return config.globalSettings;
};

export const getUserSettings = (username: string): UserSettings => {
  const config = loadConfig();
  if (!config.userSettings[username]) {
    // Create default user settings if they don't exist
    config.userSettings[username] = {
      name: username,
      signature: config.globalSettings.defaultSignature,
      canReceiveMails: true,
      vacationMode: false,
      vacationMessage: ""
    };
    saveConfig(config);
  }
  return config.userSettings[username];
};

export const updateUserSettings = (username: string, updates: Partial<UserSettings>): UserSettings => {
  const config = loadConfig();
  if (!config.userSettings[username]) {
    config.userSettings[username] = {
      name: username,
      signature: config.globalSettings.defaultSignature,
      canReceiveMails: true,
      vacationMode: false,
      vacationMessage: ""
    };
  }
  config.userSettings[username] = { ...config.userSettings[username], ...updates };
  saveConfig(config);
  return config.userSettings[username];
};