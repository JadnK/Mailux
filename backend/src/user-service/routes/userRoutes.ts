import { Router } from "express";
import {
  listUsers,
  getSingleUser,
  updateUser,
  deactivateUser,
  createUser,
} from "../controllers/userController.js";

const router = Router();

// User Endpoints
router.get("/", listUsers);
router.get("/:username", getSingleUser);
router.patch("/:username", updateUser);
router.delete("/:username", deactivateUser);
router.post("/create", createUser);

export default router;
