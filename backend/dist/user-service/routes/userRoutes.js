import { Router } from "express";
import { listUsers, getSingleUser, updateUserSettings, deactivateUserAccount } from "../controllers/userController.js";
const router = Router();
// User Endpoints
router.get("/", listUsers);
router.get("/:username", getSingleUser);
router.patch("/:username", updateUserSettings);
router.delete("/:username", deactivateUserAccount);
export default router;
