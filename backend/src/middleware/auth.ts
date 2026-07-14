import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    username: string;
  };
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secretkey"
    ) as { username: string };

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRoot = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.username !== "root") {
    return res.status(403).json({ message: "Root access required" });
  }

  next();
};