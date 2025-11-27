import { execSync } from "child_process";
// In-Memory Store (später DB)
const userSettingsStore = {};
// Alle Linux-User (außer root) auslesen
export const getAllUsers = () => {
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
export const getUser = (username) => {
    return userSettingsStore[username] || null;
};
// User Updaten
export const updateUser = (username, updates) => {
    if (!userSettingsStore[username])
        return null;
    userSettingsStore[username] = { ...userSettingsStore[username], ...updates };
    return userSettingsStore[username];
};
// Empfangsrechte weg nehmen -> no reply
export const deactivateUser = (username) => {
    if (!userSettingsStore[username])
        return false;
    userSettingsStore[username].canReceiveMail = false;
    return true;
};
