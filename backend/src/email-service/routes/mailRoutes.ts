import { Router } from "express";
import { sendEmail, getInboxMails, getSentMails, replyEmail, addFolder, listFolders } from "../controllers/mailController.js";

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

export default router;
