import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.js";
import {
  getGlobalSettings,
  updateGlobalSettings,
  getUserSettings,
  updateUserSettings,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../services/settingsService.js";
import {
  syncMailRouting,
  isValidForwardingAddress,
  isValidSieveDate,
} from "../services/mailRoutingService.js";
import { getMailboxUsageBytes } from "../services/storageService.js";
import { authenticateUser, setSystemPassword } from "../../user-service/services/userService.js";
import { updateSessionPassword } from "../../auth/sessionStore.js";

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

// canReceiveMail is an account-level flag, managed through user
// administration, not settable here.
export const modifyMySettings = (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: {
      name?: string;
      signature?: string;
      vacationMode?: boolean;
      vacationSubject?: string;
      vacationMessage?: string;
      vacationStart?: string | null;
      vacationEnd?: string | null;
      forwardingAddress?: string | null;
    } = {};

    if (typeof body.name === "string") updates.name = body.name;
    if (typeof body.signature === "string") updates.signature = body.signature;
    if (typeof body.vacationMode === "boolean") updates.vacationMode = body.vacationMode;
    if (typeof body.vacationSubject === "string") updates.vacationSubject = body.vacationSubject;
    if (typeof body.vacationMessage === "string") updates.vacationMessage = body.vacationMessage;

    for (const field of ["vacationStart", "vacationEnd"] as const) {
      if (!(field in body)) continue;
      const raw = body[field];

      if (raw === null || raw === "") {
        updates[field] = null;
        continue;
      }

      if (typeof raw !== "string" || !isValidSieveDate(raw)) {
        return res.status(400).json({ message: "Datum bitte im Format JJJJ-MM-TT angeben" });
      }

      updates[field] = raw;
    }

    if (
      (updates.vacationStart ?? undefined) &&
      (updates.vacationEnd ?? undefined) &&
      updates.vacationStart! > updates.vacationEnd!
    ) {
      return res.status(400).json({ message: "Der Start der Abwesenheit muss vor dem Ende liegen" });
    }

    if ("forwardingAddress" in body) {
      const raw = body.forwardingAddress;
      if (raw === null || raw === "") {
        updates.forwardingAddress = null;
      } else if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!isValidForwardingAddress(trimmed)) {
          return res.status(400).json({ message: "Bitte eine gültige Weiterleitungs-Adresse angeben" });
        }
        updates.forwardingAddress = trimmed;
      }
    }

    const updated = updateUserSettings(username(req), updates);

    try {
      syncMailRouting(username(req), {
        forwardingAddress: updated.forwardingAddress,
        vacationMode: updated.vacationMode,
        vacationSubject: updated.vacationSubject,
        vacationMessage: updated.vacationMessage,
        vacationStart: updated.vacationStart,
        vacationEnd: updated.vacationEnd,
      });
    } catch (err) {
      // Settings were already saved above - a Sieve sync failure (e.g. an
      // unwritable home directory) shouldn't roll that back, but it does
      // mean forwarding/autoresponder won't actually be live yet.
      console.error("syncMailRouting error:", err);
    }

    res.json(updated);
  } catch (err) {
    console.error("modifyMySettings error:", err);
    res.status(500).json({ message: "Error updating settings" });
  }
};

// ---------- own password ----------

export const changeMyPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Aktuelles und neues Passwort sind erforderlich" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Neues Passwort muss mindestens 8 Zeichen haben" });
    }

    const user = username(req);

    try {
      await authenticateUser(user, currentPassword);
    } catch {
      return res.status(401).json({ message: "Aktuelles Passwort ist falsch" });
    }

    setSystemPassword(user, newPassword);

    // Keep the session that just changed the password alive with the new
    // one - IMAP/SMTP calls read it from the session on every request, so
    // without this the user would be silently logged out mid-session.
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
    if (token) updateSessionPassword(token, newPassword);

    res.json({ message: "Passwort geändert" });
  } catch (err) {
    console.error("changeMyPassword error:", err);
    res.status(500).json({ message: "Error changing password" });
  }
};

// ---------- own mailbox storage usage ----------

export const fetchMyUsage = (req: AuthRequest, res: Response) => {
  try {
    const usedBytes = getMailboxUsageBytes(username(req));
    const { maxStorageMB } = getGlobalSettings();
    res.json({ usedBytes, limitBytes: maxStorageMB * 1024 * 1024 });
  } catch (err) {
    console.error("fetchMyUsage error:", err);
    res.status(500).json({ message: "Error fetching mailbox usage" });
  }
};

// ---------- own quick-reply templates ----------

export const fetchMyTemplates = (req: AuthRequest, res: Response) => {
  try {
    res.json({ templates: listTemplates(username(req)) });
  } catch (err) {
    console.error("fetchMyTemplates error:", err);
    res.status(500).json({ message: "Error fetching templates" });
  }
};

export const addMyTemplate = (req: AuthRequest, res: Response) => {
  try {
    const { name, body } = req.body as { name?: string; body?: string };
    if (!name?.trim() || typeof body !== "string") {
      return res.status(400).json({ message: "name und body sind erforderlich" });
    }

    const template = createTemplate(username(req), name, body);
    res.status(201).json(template);
  } catch (err: any) {
    console.error("addMyTemplate error:", err);
    res.status(400).json({ message: err?.message || "Error creating template" });
  }
};

export const editMyTemplate = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, body } = req.body as { name?: string; body?: string };

    const updated = updateTemplate(username(req), id, { name, body });
    if (!updated) return res.status(404).json({ message: "Vorlage nicht gefunden" });

    res.json(updated);
  } catch (err) {
    console.error("editMyTemplate error:", err);
    res.status(500).json({ message: "Error updating template" });
  }
};

export const removeMyTemplate = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const removed = deleteTemplate(username(req), id);
    if (!removed) return res.status(404).json({ message: "Vorlage nicht gefunden" });

    res.json({ message: "Vorlage gelöscht" });
  } catch (err) {
    console.error("removeMyTemplate error:", err);
    res.status(500).json({ message: "Error deleting template" });
  }
};

// ---------- site-wide settings (admin only - enforced at the route level) ----------

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
