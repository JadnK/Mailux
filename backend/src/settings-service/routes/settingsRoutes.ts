import { Router } from "express";
import {
  fetchGlobalSettings,
  modifyGlobalSettings,
  fetchMySettings,
  modifyMySettings,
  changeMyPassword,
  fetchMyUsage,
  fetchMyTemplates,
  addMyTemplate,
  editMyTemplate,
  removeMyTemplate,
} from "../controllers/settingsController.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

// Own settings (including forwarding + autoresponder) - any authenticated
// user, scoped to themselves via the session (never a :username path
// param, so there's no way to read or edit someone else's settings by
// editing the URL).
router.get("/me", fetchMySettings);
router.patch("/me", modifyMySettings);

// Own password - re-verifies the current one via PAM before changing it.
router.patch("/me/password", changeMyPassword);

// Own mailbox storage usage.
router.get("/me/usage", fetchMyUsage);

// Own quick-reply templates.
router.get("/me/templates", fetchMyTemplates);
router.post("/me/templates", addMyTemplate);
router.patch("/me/templates/:id", editMyTemplate);
router.delete("/me/templates/:id", removeMyTemplate);

// Site-wide settings - admins only.
router.get("/global", requireAdmin, fetchGlobalSettings);
router.patch("/global", requireAdmin, modifyGlobalSettings);

export default router;
