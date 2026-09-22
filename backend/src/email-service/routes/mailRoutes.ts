import { Router } from "express";
import {
  sendEmail,
  uploadAttachments,
  getMailboxMails,
  downloadAttachment,
  deleteEmail,
} from "../controllers/mailController.js";

const router = Router();

router.post("/send", uploadAttachments, sendEmail);
router.get("/box/:mailbox", getMailboxMails);
router.get("/attachment/:mailbox/:uid/:index", downloadAttachment);
router.delete("/delete", deleteEmail);

export default router;
