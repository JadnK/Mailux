import { Router } from "express";
import dotenv from "dotenv";
dotenv.config();
const router = Router();
// Dummy users, später in DB speichern
const users = {
    jaden: "test123",
    alice: "password",
};
router.post("/", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }
    if (!users[username] || users[username] !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    // Optional: JWT Token generieren, z.B. mit jsonwebtoken
    // const token = jwt.sign({ username }, process.env.JWT_SECRET!, { expiresIn: "1h" });
    return res.json({ username /*, token */ });
});
export default router;
