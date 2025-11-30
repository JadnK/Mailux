import UserService from "../services/userService.js";
const userService = new UserService();
export const listUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsersWithMaildir();
        return res.json(users);
    }
    catch (err) {
        console.error("listUsers error:", err);
        return res.status(500).json({ message: "Failed to list users" });
    }
};
export const getSingleUser = async (req, res) => {
    try {
        const username = req.params.username;
        if (!username)
            return res.status(400).json({ message: "username required" });
        const user = await userService.getUser(username);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.json(user);
    }
    catch (err) {
        console.error("getSingleUser error:", err);
        return res.status(500).json({ message: "Failed to get user" });
    }
};
export const updateUser = async (req, res) => {
    try {
        const username = req.params.username;
        const updates = req.body;
        if (!username)
            return res.status(400).json({ message: "username required" });
        const updated = await userService.updateUser(username, updates);
        if (!updated)
            return res.status(404).json({ message: "User not found" });
        return res.json(updated);
    }
    catch (err) {
        console.error("updateUser error:", err);
        return res.status(500).json({ message: "Failed to update user" });
    }
};
export const deactivateUser = async (req, res) => {
    try {
        const username = req.params.username;
        if (!username)
            return res.status(400).json({ message: "username required" });
        const ok = await userService.deactivateUser(username);
        if (!ok)
            return res.status(404).json({ message: "User not found or already inactive" });
        return res.json({ message: "User deactivated" });
    }
    catch (err) {
        console.error("deactivateUser error:", err);
        return res.status(500).json({ message: "Failed to deactivate user" });
    }
};
export const createUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password required" });
        }
        const success = await userService.createUser(username, password);
        if (!success) {
            return res.status(500).json({ message: "Failed to create user" });
        }
        return res.json({ message: "User created successfully", username });
    }
    catch (err) {
        console.error("createUser error:", err);
        return res.status(500).json({ message: "Failed to create user" });
    }
};
