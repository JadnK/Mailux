import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runtime data file - intentionally gitignored, recreated on first run.
const CONFIG_PATH = path.join(__dirname, "../../../config.json");

export interface MailTemplate {
  id: string;
  name: string;
  /** HTML - matches what the rich text compose editor produces/consumes. */
  body: string;
}

interface UserSettings {
  name: string;
  signature: string;
  canReceiveMail: boolean;
  vacationMode: boolean;
  vacationSubject?: string;
  vacationMessage?: string;
  /** "YYYY-MM-DD", or null/undefined for no bound. Autoresponder only
   *  fires within [vacationStart, vacationEnd] when either is set. */
  vacationStart?: string | null;
  vacationEnd?: string | null;
  /** Plain address incoming mail is additionally copied to, or null when
   *  forwarding is off. See mailRoutingService.ts for what actually acts
   *  on this (a Dovecot Sieve script, kept in sync by modifyMySettings). */
  forwardingAddress: string | null;
  templates: MailTemplate[];
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
    vacationSubject: "",
    vacationMessage: "",
    vacationStart: null,
    vacationEnd: null,
    forwardingAddress: null,
    templates: [],
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
    return config.userSettings[username];
  }

  // Backfill fields added after this account's settings were first
  // written (e.g. an existing config.json from before forwarding/
  // templates existed) - non-destructive, keeps whatever's already there.
  const merged = {
    ...defaultUserSettings(username, config.globalSettings),
    ...config.userSettings[username],
  };
  config.userSettings[username] = merged;

  return merged;
};

// ---------- per-user quick-reply templates ----------

const MAX_TEMPLATE_NAME_LENGTH = 80;
const MAX_TEMPLATE_BODY_LENGTH = 20000;

function ensureUserEntry(config: ConfigData, username: string): UserSettings {
  if (!config.userSettings[username]) {
    config.userSettings[username] = defaultUserSettings(username, config.globalSettings);
  }
  if (!config.userSettings[username].templates) {
    config.userSettings[username].templates = [];
  }
  return config.userSettings[username];
}

export const listTemplates = (username: string): MailTemplate[] => {
  return getUserSettings(username).templates ?? [];
};

export const createTemplate = (username: string, name: string, body: string): MailTemplate => {
  const trimmedName = name.trim().slice(0, MAX_TEMPLATE_NAME_LENGTH);
  if (!trimmedName) {
    throw new Error("Name der Vorlage darf nicht leer sein");
  }

  const config = loadConfig();
  const settings = ensureUserEntry(config, username);

  const template: MailTemplate = {
    id: randomUUID(),
    name: trimmedName,
    body: body.slice(0, MAX_TEMPLATE_BODY_LENGTH),
  };

  settings.templates = [...settings.templates, template];
  saveConfig(config);
  return template;
};

export const updateTemplate = (
  username: string,
  id: string,
  updates: { name?: string; body?: string }
): MailTemplate | null => {
  const config = loadConfig();
  const settings = ensureUserEntry(config, username);

  const index = settings.templates.findIndex((template) => template.id === id);
  if (index === -1) return null;

  const current = settings.templates[index];
  const next: MailTemplate = {
    ...current,
    name:
      typeof updates.name === "string"
        ? updates.name.trim().slice(0, MAX_TEMPLATE_NAME_LENGTH) || current.name
        : current.name,
    body: typeof updates.body === "string" ? updates.body.slice(0, MAX_TEMPLATE_BODY_LENGTH) : current.body,
  };

  settings.templates = [...settings.templates];
  settings.templates[index] = next;
  saveConfig(config);
  return next;
};

export const deleteTemplate = (username: string, id: string): boolean => {
  const config = loadConfig();
  const settings = ensureUserEntry(config, username);

  const nextTemplates = settings.templates.filter((template) => template.id !== id);
  const removed = nextTemplates.length !== settings.templates.length;
  settings.templates = nextTemplates;

  if (removed) saveConfig(config);
  return removed;
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
