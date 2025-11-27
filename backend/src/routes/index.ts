import { Router } from "express";
import mailRouter from "../email-service/routes/mailRoutes.js";
import userRouter from "../user-service/routes/userRoutes.js";
import settingsRouter from "../settings-service/routes/settingsRoutes.js";

const router = Router();

// Mail Endpoints
router.use("/mail", mailRouter);
router.use("/users", userRouter);
router.use("/settings", settingsRouter);

export default router;
