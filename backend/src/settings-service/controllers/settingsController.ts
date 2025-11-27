import { Request, Response } from "express";
import { getGlobalSettings, updateGlobalSettings, getUserSettings, updateUserSettings } from "../services/settingsService.js";

// Global Settings
export const fetchGlobalSettings = (req: Request, res: Response) => {
  res.json(getGlobalSettings());
};

export const modifyGlobalSettings = (req: Request, res: Response) => {
  const updated = updateGlobalSettings(req.body);
  res.json(updated);
};

// User Settings
export const fetchUserSettings = (req: Request, res: Response) => {
  const { username } = req.params;
  res.json(getUserSettings(username));
};

export const modifyUserSettings = (req: Request, res: Response) => {
  const { username } = req.params;
  const updated = updateUserSettings(username, req.body);
  res.json(updated);
};
