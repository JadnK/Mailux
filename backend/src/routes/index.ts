import { Router } from "express";
import mailRouter from "../email-service/routes/mailRoutes.js";

const router = Router();

// Mail Endpoints
router.use("/mail", mailRouter);

export default router;
