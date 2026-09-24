import { Router } from "express";

import mailRouter from "../email-service/routes/mailRoutes.js";
import userRouter from "../user-service/routes/userRoutes.js";
import settingsRouter from "../settings-service/routes/settingsRoutes.js";
import login from "./users.js";
import { requireAuth } from "../middleware/auth.js";
import { destroySession } from "../auth/sessionStore.js";

const router = Router();

router.use("/login", login);

router.use(requireAuth);

// Logging out used to be a purely client-side localStorage.removeItem() -
// the session token itself stayed valid server-side for up to its full TTL
// (30 days by default). This actually revokes it, so a token that leaked
// or was left behind (shared computer, stolen device, etc.) stops working
// the moment the user logs out instead of quietly staying live.
router.post("/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (token) destroySession(token);
  res.json({ message: "Logged out" });
});

router.use("/mail", mailRouter);
router.use("/users", userRouter);
router.use("/settings", settingsRouter);

export default router;
