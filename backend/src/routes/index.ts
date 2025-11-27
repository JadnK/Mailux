import { Router } from "express";
import mailRouter from "../email-service/routes/mailRoutes.js";
import userRouter from "../user-service/routes/userRoutes.js";

const router = Router();

// Mail Endpoints
router.use("/mail", mailRouter);
router.use("/users", userRouter);

export default router;
