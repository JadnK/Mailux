import { Request, Response, NextFunction } from "express";
import { getSession } from "../auth/sessionStore.js";

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

export const requireRoot = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.username !== "root") {
    return res.status(403).json({ message: "Root access required" });
  }

  next();
};
