import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runtime data file - intentionally gitignored, recreated on first run.
const CONFIG_PATH = path.join(__dirname, "../../../config.json");

interface UserSettings {
  name: string;
  signature: string;
  canReceiveMail: boolean;
  vacationMode: boolean;
  vacationMessage?: string;
  /** A small avatar image as a data: URL (set via the avatar upload endpoint). */
  profilePicture?: string;
}

interface GlobalSettings {
  defaultSignature: string;
  maxStorageMB: number;
}

interface ConfigData {
  globalSettings: GlobalSettings;
  userSettings: { [username: string]: UserSettings };
}

const DEFAULT_CONFIG: ConfigData = {
  globalSettings: {
    defaultSignature: "Sent with Mailux",
    maxStorageMB: 1024,
  },
  userSettings: {},
};

function loadConfig(): ConfigData {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return structuredClone(DEFAULT_CONFIG);
    }

    const data = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(data) as ConfigData;
  } catch (error) {
    console.error("Error loading config:", error);
    return structuredClone(DEFAULT_CONFIG);
  }
}

function saveConfig(config: ConfigData): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Error saving config:", error);
    throw error;
  }
}

function defaultUserSettings(username: string, globalSettings: GlobalSettings): UserSettings {
  return {
    name: username,
    signature: globalSettings.defaultSignature,
    canReceiveMail: true,
    vacationMode: false,
    vacationMessage: "",
    profilePicture: undefined,
  };
}

export const getGlobalSettings = (): GlobalSettings => {
  return loadConfig().globalSettings;
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
    config.userSettings[username] = defaultUserSettings(username, config.globalSettings);
    saveConfig(config);
  }

  return config.userSettings[username];
};

export const updateUserSettings = (
  username: string,
  updates: Partial<UserSettings>
): UserSettings => {
  const config = loadConfig();

  config.userSettings[username] = {
    ...(config.userSettings[username] ?? defaultUserSettings(username, config.globalSettings)),
    ...updates,
  };

  saveConfig(config);
  return config.userSettings[username];
};
