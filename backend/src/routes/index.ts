import { Router } from "express";
import mailRouter from "../email-service/routes/mailRoutes.js";
import userRouter from "../user-service/routes/userRoutes.js";
import login from "./users.js";

const router = Router();

// Mail Endpoints
router.use("/mail", mailRouter);
router.use("/users", userRouter);
router.use("/login", login);

export default router;
