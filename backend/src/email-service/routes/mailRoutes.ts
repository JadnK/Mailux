import { Router } from "express";
import {
  sendEmail,
  uploadAttachments,
  getMailboxMails,
  downloadAttachment,
  deleteEmail,
  markMailRead,
} from "../controllers/mailController.js";

const router = Router();

router.post("/send", uploadAttachments, sendEmail);
router.get("/box/:mailbox", getMailboxMails);
router.get("/attachment/:mailbox/:uid/:index", downloadAttachment);
router.delete("/delete", deleteEmail);
router.patch("/box/:mailbox/:uid/read", markMailRead);

export default router;
