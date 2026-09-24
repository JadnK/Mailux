import { Request, Response, NextFunction } from "express";
import { getSession } from "../auth/sessionStore.js";
import { isAdminUsername } from "../user-service/services/userService.js";

export interface AuthRequest extends Request {
  user?: {
    username: string;
    /** The user's mail password, needed to talk to IMAP/SMTP on their behalf. */
    password: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const session = token ? getSession(token) : null;

  if (!session) {
    return res.status(401).json({ message: "Session expired" });
  }

  req.user = { username: session.username, password: session.password };
  next();
};

/**
 * Admin access is no longer tied to the literal "root" account - it's
 * derived live from system sudo/wheel group membership (see
 * isAdminUsername), the same way `sudo` itself decides who's privileged.
 * That means any account can be made an admin (and keep a normal mailbox
 * alongside it), not just root.
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const username = req.user?.username;

  if (!username || !(await isAdminUsername(username))) {
    return res.status(403).json({ message: "Admin-Rechte erforderlich" });
  }

  next();
};
