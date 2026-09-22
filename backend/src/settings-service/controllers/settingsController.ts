import { Response } from "express";
import multer from "multer";
import { AuthRequest } from "../../middleware/auth.js";
import {
  getGlobalSettings,
  updateGlobalSettings,
  getUserSettings,
  updateUserSettings,
} from "../services/settingsService.js";

function username(req: AuthRequest): string {
  if (!req.user) {
    throw new Error("Not authenticated");
  }
  return req.user.username;
}

// ---------- own (self-service) settings ----------

export const fetchMySettings = (req: AuthRequest, res: Response) => {
  try {
    res.json(getUserSettings(username(req)));
  } catch (err) {
    console.error("fetchMySettings error:", err);
    res.status(500).json({ message: "Error fetching settings" });
  }
};

// Only these fields are user-editable via PATCH. canReceiveMail is an
// account-level flag (managed through user administration) and
// profilePicture has its own upload endpoint below - neither should be
// settable through a generic PATCH body.
const EDITABLE_FIELDS = ["name", "signature"] as const;

export const modifyMySettings = (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: { name?: string; signature?: string } = {};

    for (const field of EDITABLE_FIELDS) {
      if (typeof body[field] === "string") {
        updates[field] = body[field] as string;
      }
    }

    const updated = updateUserSettings(username(req), updates);
    res.json(updated);
  } catch (err) {
    console.error("modifyMySettings error:", err);
    res.status(500).json({ message: "Error updating settings" });
  }
};

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024;

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadMyAvatar = avatarUpload.single("avatar");

export const setMyAvatar = (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const updated = updateUserSettings(username(req), { profilePicture: dataUrl });
    res.json(updated);
  } catch (err) {
    console.error("setMyAvatar error:", err);
    res.status(500).json({ message: "Error uploading avatar" });
  }
};

export const removeMyAvatar = (req: AuthRequest, res: Response) => {
  try {
    const updated = updateUserSettings(username(req), { profilePicture: undefined });
    res.json(updated);
  } catch (err) {
    console.error("removeMyAvatar error:", err);
    res.status(500).json({ message: "Error removing avatar" });
  }
};

// ---------- site-wide settings (root only - enforced at the route level) ----------

export const fetchGlobalSettings = (_req: AuthRequest, res: Response) => {
  try {
    res.json(getGlobalSettings());
  } catch (err) {
    console.error("fetchGlobalSettings error:", err);
    res.status(500).json({ message: "Error fetching global settings" });
  }
};

export const modifyGlobalSettings = (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: { defaultSignature?: string; maxStorageMB?: number } = {};

    if (typeof body.defaultSignature === "string") {
      updates.defaultSignature = body.defaultSignature;
    }
    if (typeof body.maxStorageMB === "number" && Number.isFinite(body.maxStorageMB)) {
      updates.maxStorageMB = body.maxStorageMB;
    }

    const updated = updateGlobalSettings(updates);
    res.json(updated);
  } catch (err) {
    console.error("modifyGlobalSettings error:", err);
    res.status(500).json({ message: "Error updating global settings" });
  }
};
