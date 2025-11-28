import { Router } from "express";
import {
  listUsers,
  getSingleUser,
  updateUser,
  deactivateUser,
} from "../controllers/userController.js";

const router = Router();

// User Endpoints
router.get("/", listUsers);
router.get("/:username", getSingleUser);
router.patch("/:username", updateUser);
router.delete("/:username", deactivateUser);

export default router;
