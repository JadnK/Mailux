import { Router } from "express";
import { fetchGlobalSettings, modifyGlobalSettings, fetchUserSettings, modifyUserSettings } from "../controllers/settingsController.js";
const router = Router();
// Global Settings Endpoints
router.get("/", fetchGlobalSettings);
router.patch("/", modifyGlobalSettings);
// User-specific Settings Endpoints
router.get("/:username", fetchUserSettings);
router.patch("/:username", modifyUserSettings);
export default router;
