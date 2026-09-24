import { Router } from "express";

import {
  listUsers,
  getSingleUser,
  updateUser,
  deactivateUser,
  createUser,
  setUserAdmin,
} from "../controllers/userController.js";

import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

router.use(requireAdmin);

// User Endpoints
router.get("/", listUsers);
router.post("/create", createUser);
router.get("/:username", getSingleUser);
router.patch("/:username", updateUser);
router.patch("/:username/admin", setUserAdmin);
router.delete("/:username", deactivateUser);

export default router;
