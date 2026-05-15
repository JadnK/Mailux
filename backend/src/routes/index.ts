import { Router } from "express";

import mailRouter from "../email-service/routes/mailRoutes.js";
import userRouter from "../user-service/routes/userRoutes.js";
import settingsRouter from "../settings-service/routes/settingsRoutes.js";
import login from "./users.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use("/login", login);

router.use(requireAuth);

router.use("/mail", mailRouter);
router.use("/users", userRouter);
router.use("/settings", settingsRouter);

export default router;