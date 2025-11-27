import { execSync } from "child_process";

// User Settings Interface
export interface UserSettings {
  username: string;
  name?: string;
  profilePicture?: string;
  signature?: string;
  canReceiveMail?: boolean;
}

// In-Memory Store (später DB)
const userSettingsStore: Record<string, UserSettings> = {};

// Alle Linux-User (außer root) auslesen
export const getAllUsers = (): UserSettings[] => {
  const output = execSync("getent passwd").toString();
  const users = output
    .split("\n")
    .map(line => line.split(":")[0])
    .filter(username => username && username !== "root");

  return users.map(username => {
    if (!userSettingsStore[username]) {
      userSettingsStore[username] = { username, canReceiveMail: true };
    }
    return userSettingsStore[username];
  });
};

// Einzelnen User abrufens
export const getUser = (username: string): UserSettings | null => {
  return userSettingsStore[username] || null;
};

// User Updaten
export const updateUser = (username: string, updates: Partial<UserSettings>): UserSettings | null => {
  if (!userSettingsStore[username]) return null;
  userSettingsStore[username] = { ...userSettingsStore[username], ...updates };
  return userSettingsStore[username];
};

// Empfangsrechte weg nehmen -> no reply
export const deactivateUser = (username: string): boolean => {
  if (!userSettingsStore[username]) return false;
  userSettingsStore[username].canReceiveMail = false;
  return true;
};
