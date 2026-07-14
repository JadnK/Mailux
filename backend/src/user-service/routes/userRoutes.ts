import { Router } from "express";

import {
  listUsers,
  getSingleUser,
  updateUser,
  deactivateUser,
  createUser,
} from "../controllers/userController.js";

import { requireRoot } from "../../middleware/auth.js";

const router = Router();

router.use(requireRoot);

// User Endpoints
router.get("/", listUsers);
router.post("/create", createUser);
router.get("/:username", getSingleUser);
router.patch("/:username", updateUser);
router.delete("/:username", deactivateUser);

export default router;