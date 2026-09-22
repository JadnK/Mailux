import { Router } from "express";
import {
  fetchGlobalSettings,
  modifyGlobalSettings,
  fetchMySettings,
  modifyMySettings,
  fetchMyForwarding,
  modifyMyForwarding,
} from "../controllers/settingsController.js";
import { requireRoot } from "../../middleware/auth.js";

const router = Router();

// Own settings - any authenticated user, scoped to themselves via the
// session (never a :username path param, so there's no way to read or
// edit someone else's settings by editing the URL).
router.get("/me", fetchMySettings);
router.patch("/me", modifyMySettings);

// Own mail forwarding - same self-scoping as above.
router.get("/me/forwarding", fetchMyForwarding);
router.patch("/me/forwarding", modifyMyForwarding);

// Site-wide settings - root only.
router.get("/global", requireRoot, fetchGlobalSettings);
router.patch("/global", requireRoot, modifyGlobalSettings);

export default router;
