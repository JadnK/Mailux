// Default Settings
let globalSettings = {
    defaultSignature: "Sent with Mailux",
    maxStorageMB: 1024,
    allowExternalEmails: true,
    mailServerHost: "localhost",
    mailServerPort: 587,
};
const userOverrides = {};
export const getGlobalSettings = () => globalSettings;
export const updateGlobalSettings = (updates) => {
    globalSettings = { ...globalSettings, ...updates };
    return globalSettings;
};
export const getUserSettings = (username) => {
    return { ...globalSettings, ...(userOverrides[username] || {}) };
};
export const updateUserSettings = (username, updates) => {
    if (!userOverrides[username])
        userOverrides[username] = {};
    userOverrides[username] = { ...userOverrides[username], ...updates };
    return getUserSettings(username);
};
