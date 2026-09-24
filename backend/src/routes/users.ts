import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateUser, isAdminUsername } from "../user-service/services/userService.js";
import { createSession } from "../auth/sessionStore.js";

const router = Router();

// PAM auth is only as strong as the account password behind it, and this
// endpoint can authenticate as root (or any other sudo account) - rate
// limit it against brute-forcing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});

router.post("/", loginLimiter, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    await authenticateUser(username, password);
  } catch {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createSession(username, password);
  const isAdmin = await isAdminUsername(username);
  return res.json({ username, token, isAdmin });
});

export default router;
