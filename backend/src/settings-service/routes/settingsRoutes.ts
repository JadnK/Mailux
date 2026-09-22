import { Router } from "express";
import {
  fetchGlobalSettings,
  modifyGlobalSettings,
  fetchMySettings,
  modifyMySettings,
  uploadMyAvatar,
  setMyAvatar,
  removeMyAvatar,
} from "../controllers/settingsController.js";
import { requireRoot } from "../../middleware/auth.js";

const router = Router();

// Own settings - any authenticated user, scoped to themselves via the
// session (never a :username path param, so there's no way to read or
// edit someone else's settings by editing the URL).
router.get("/me", fetchMySettings);
router.patch("/me", modifyMySettings);
router.post("/me/avatar", uploadMyAvatar, setMyAvatar);
router.delete("/me/avatar", removeMyAvatar);

// Site-wide settings - root only.
router.get("/global", requireRoot, fetchGlobalSettings);
router.patch("/global", requireRoot, modifyGlobalSettings);

export default router;
