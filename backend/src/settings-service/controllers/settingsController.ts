import { Request, Response } from "express";
import { getGlobalSettings, updateGlobalSettings, getUserSettings, updateUserSettings } from "../services/settingsService.js";

// Global Settings
export const fetchGlobalSettings = (req: Request, res: Response) => {
  try {
    res.json(getGlobalSettings());
  } catch (error) {
    res.status(500).json({ message: "Error fetching global settings" });
  }
};

export const modifyGlobalSettings = (req: Request, res: Response) => {
  try {
    const updated = updateGlobalSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating global settings" });
  }
};

// User Settings
export const fetchUserSettings = (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const settings = getUserSettings(username);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user settings" });
  }
};

export const modifyUserSettings = (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const updated = updateUserSettings(username, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating user settings" });
  }
};