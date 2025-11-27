import { Request, Response } from "express";
import { getAllUsers, getUser, updateUser, deactivateUser } from "../services/userService.js";

export const listUsers = (req: Request, res: Response) => {
  const users = getAllUsers();
  res.json(users);
};

export const getSingleUser = (req: Request, res: Response) => {
  const user = getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const updateUserSettings = (req: Request, res: Response) => {
  const updated = updateUser(req.params.username, req.body);
  if (!updated) return res.status(404).json({ message: "User not found" });
  res.json(updated);
};

export const deactivateUserAccount = (req: Request, res: Response) => {
  const success = deactivateUser(req.params.username);
  if (!success) return res.status(404).json({ message: "User not found" });
  res.json({ message: "User deactivated" });
};
