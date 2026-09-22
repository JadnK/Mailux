import { Router } from "express";
import {
  sendEmail,
  uploadAttachments,
  getMailboxMails,
  downloadAttachment,
  deleteEmail,
  markMailRead,
  markMailUnread,
  getFolders,
  createMailFolder,
  moveEmail,
} from "../controllers/mailController.js";

const router = Router();

router.post("/send", uploadAttachments, sendEmail);
router.get("/box/:mailbox", getMailboxMails);
router.get("/attachment/:mailbox/:uid/:index", downloadAttachment);
router.delete("/delete", deleteEmail);
router.patch("/box/:mailbox/:uid/read", markMailRead);
router.patch("/box/:mailbox/:uid/unread", markMailUnread);
router.patch("/box/:mailbox/:uid/move", moveEmail);
router.get("/folders", getFolders);
router.post("/folders", createMailFolder);

export default router;
