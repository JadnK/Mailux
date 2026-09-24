import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.js";
import UserService from "../services/userService.js";

const userService = new UserService();

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await userService.getAllUsersWithMaildir();
    return res.json(users);
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Failed to list users" });
  }
};

export const getSingleUser = async (req: AuthRequest, res: Response) => {
  try {
    const username = req.params.username;
    if (!username) return res.status(400).json({ message: "username required" });

    const user = await userService.getUser(username);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err) {
    console.error("getSingleUser error:", err);
    return res.status(500).json({ message: "Failed to get user" });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const username = req.params.username;
    const updates = req.body;
    if (!username) return res.status(400).json({ message: "username required" });

    const updated = await userService.updateUser(username, updates);
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json(updated);
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ message: "Failed to update user" });
  }
};

export const setUserAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const username = req.params.username;
    const { isAdmin } = req.body as { isAdmin?: boolean };

    if (!username) return res.status(400).json({ message: "username required" });
    if (typeof isAdmin !== "boolean") {
      return res.status(400).json({ message: "isAdmin (boolean) required" });
    }

    if (req.user?.username === username && !isAdmin) {
      return res.status(400).json({
        message: "Du kannst dir nicht selbst die Admin-Rechte entziehen.",
      });
    }

    await userService.setAdmin(username, isAdmin);
    return res.json({ username, isAdmin });
  } catch (err) {
    console.error("setUserAdmin error:", err);
    const message = err instanceof Error ? err.message : "Failed to update admin status";
    return res.status(400).json({ message });
  }
};

export const deactivateUser = async (req: AuthRequest, res: Response) => {
  try {
    const username = req.params.username;
    if (!username) return res.status(400).json({ message: "username required" });

    if (req.user?.username === username) {
      return res.status(400).json({ message: "Du kannst dich nicht selbst löschen." });
    }

    const ok = await userService.deleteUser(username);
    if (!ok) return res.status(404).json({ message: "User not found or could not be removed" });

    return res.json({ message: "User removed" });
  } catch (err) {
    console.error("deactivateUser error:", err);
    const message = err instanceof Error ? err.message : "Failed to remove user";
    // assertValidUsername / the root guard throw with a safe, user-facing message.
    return res.status(400).json({ message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, isAdmin } = req.body as {
      username?: string;
      password?: string;
      isAdmin?: boolean;
    };

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const usernameRegex = /^[a-z_][a-z0-9_-]{0,31}$/;

    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: "Invalid username" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const success = await userService.createUser(username, password, { isAdmin: !!isAdmin });
    if (!success) {
      return res.status(500).json({ message: "Failed to create user" });
    }

    return res.json({ message: "User created successfully", username, isAdmin: !!isAdmin });
  } catch (err) {
    console.error("createUser error:", err);
    return res.status(500).json({ message: "Failed to create user" });
  }
};
