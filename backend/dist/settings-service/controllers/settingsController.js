import { getGlobalSettings, updateGlobalSettings, getUserSettings, updateUserSettings } from "../services/settingsService.js";
// Global Settings
export const fetchGlobalSettings = (req, res) => {
    res.json(getGlobalSettings());
};
export const modifyGlobalSettings = (req, res) => {
    const updated = updateGlobalSettings(req.body);
    res.json(updated);
};
// User Settings
export const fetchUserSettings = (req, res) => {
    const { username } = req.params;
    res.json(getUserSettings(username));
};
export const modifyUserSettings = (req, res) => {
    const { username } = req.params;
    const updated = updateUserSettings(username, req.body);
    res.json(updated);
};
