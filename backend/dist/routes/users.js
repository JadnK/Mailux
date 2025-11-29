import { Router } from "express";
import jwt from "jsonwebtoken";
import { authenticateUser } from "../user-service/services/userService.js";
const router = Router();
router.post("/", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }
    try {
        await authenticateUser(username, password, "login"); // PAM-Service "login"
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ username, password }, // Passwort wird im Token gespeichert
    process.env.JWT_SECRET || "secretkey", { expiresIn: "1h" });
    return res.json({ username, token });
});
export default router;
