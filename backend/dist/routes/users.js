import { Router } from "express";
import jwt from "jsonwebtoken";
import { authenticateUser } from "../user-service/services/userService.js";
const router = Router();
router.post("/", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password required" });
        }
        try {
            await authenticateUser(username, password); // throws on fail
        }
        catch (err) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET not set in environment");
            return res.status(500).json({ message: "Server misconfiguration" });
        }
        const token = jwt.sign({ username }, jwtSecret, { expiresIn: "1h" });
        return res.json({ username, token });
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
export default router;
