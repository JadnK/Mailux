import { getAllUsers, getUser, updateUser, deactivateUser } from "../services/userService.js";
export const listUsers = (req, res) => {
    const users = getAllUsers();
    res.json(users);
};
export const getSingleUser = (req, res) => {
    const user = getUser(req.params.username);
    if (!user)
        return res.status(404).json({ message: "User not found" });
    res.json(user);
};
export const updateUserSettings = (req, res) => {
    const updated = updateUser(req.params.username, req.body);
    if (!updated)
        return res.status(404).json({ message: "User not found" });
    res.json(updated);
};
export const deactivateUserAccount = (req, res) => {
    const success = deactivateUser(req.params.username);
    if (!success)
        return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deactivated" });
};
