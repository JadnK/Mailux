import express from "express";
import { sendMail } from "../services/mailService.js";

const router = express.Router();

router.post("/send-email", async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    const info = await sendMail(to, subject, html);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
});

export default router;
