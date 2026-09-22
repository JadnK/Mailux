import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.js";
import {
  getGlobalSettings,
  updateGlobalSettings,
  getUserSettings,
  updateUserSettings,
} from "../services/settingsService.js";
import { getForwardingAddress, setForwardingAddress } from "../services/forwardingService.js";

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
// account-level flag, managed through user administration, not settable
// here.
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


// ---------- own mail forwarding (self-service, same username-scoping as above) ----------

export const fetchMyForwarding = (req: AuthRequest, res: Response) => {
  try {
    res.json({ forwardingAddress: getForwardingAddress(username(req)) });
  } catch (err) {
    console.error("fetchMyForwarding error:", err);
    res.status(500).json({ message: "Error fetching forwarding settings" });
  }
};

export const modifyMyForwarding = (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as { forwardingAddress?: string | null };
    const address = typeof body.forwardingAddress === "string" ? body.forwardingAddress : null;

    setForwardingAddress(username(req), address);
    res.json({ forwardingAddress: getForwardingAddress(username(req)) });
  } catch (err: any) {
    console.error("modifyMyForwarding error:", err);
    res.status(400).json({ message: err?.message || "Error updating forwarding settings" });
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
