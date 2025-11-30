import { Router } from "express";
import { sendEmail, getInboxMails, getSentMails, replyEmail, addFolder, listFolders, deleteEmail } from "../controllers/mailController.js";
//import { testConnection } from "../config/mail.js";
const router = Router();
// Mail Endpoints
router.post("/send", sendEmail);
//router.get("/testing", testConnection);
router.get("/inbox/:username", getInboxMails);
router.get("/sent/:username", getSentMails);
router.post("/reply", replyEmail);
router.post("/folder", addFolder);
router.get("/folder/:username", listFolders);
router.delete("/delete", deleteEmail);
export default router;
