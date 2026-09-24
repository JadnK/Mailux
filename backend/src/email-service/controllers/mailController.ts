import { Response } from "express";
import multer from "multer";
import { AuthRequest } from "../../middleware/auth.js";
import {
  sendMail,
  getMailbox,
  getAttachmentContent,
  deleteMail,
  markAsRead,
  markAsUnread,
  setFlagged,
  listFolders,
  createFolder,
  moveMail,
} from "../services/mailService.js";
import { MailAttachmentInput, MailData } from "../types/mail.js";

function credentials(req: AuthRequest): { username: string; password: string } {
  if (!req.user) {
    throw new Error("Not authenticated");
  }
  return req.user;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB per file
    files: 10,
  },
});

export const uploadAttachments = upload.array("attachments", 10);

export const sendEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { to, cc, bcc, subject, text, html } = req.body as Record<string, string | undefined>;

    if (!to || !subject) {
      return res.status(400).json({ message: "to and subject are required" });
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const attachments: MailAttachmentInput[] = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
    }));

    const mailData: MailData = {
      to,
      cc: cc?.trim() || undefined,
      bcc: bcc?.trim() || undefined,
      subject,
      text,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const info = await sendMail(mailData, username, password);
    res.status(200).json({ message: "Mail sent", id: info.messageId });
  } catch (err) {
    console.error("sendEmail error:", err);
    res.status(500).json({ message: "Failed to send mail" });
  }
};

export const getMailboxMails = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const mailbox = req.params.mailbox;
    const result = await getMailbox(username, password, mailbox);
    res.json(result);
  } catch (err) {
    console.error("getMailboxMails error:", err);
    res.status(500).json({ message: "Failed to load mailbox" });
  }
};

export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { mailbox, uid, index } = req.params;

    const attachment = await getAttachmentContent(
      username,
      password,
      mailbox,
      Number(uid),
      Number(index)
    );

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`
    );
    res.send(attachment.content);
  } catch (err) {
    console.error("downloadAttachment error:", err);
    res.status(500).json({ message: "Failed to download attachment" });
  }
};

export const markMailRead = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { mailbox, uid } = req.params;

    await markAsRead(username, password, mailbox, Number(uid));
    res.status(200).json({ message: "Marked as read" });
  } catch (err) {
    console.error("markMailRead error:", err);
    res.status(500).json({ message: "Failed to mark mail as read" });
  }
};

export const markMailUnread = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { mailbox, uid } = req.params;

    await markAsUnread(username, password, mailbox, Number(uid));
    res.status(200).json({ message: "Marked as unread" });
  } catch (err) {
    console.error("markMailUnread error:", err);
    res.status(500).json({ message: "Failed to mark mail as unread" });
  }
};

export const flagEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { mailbox, uid } = req.params;
    const { flagged } = req.body as { flagged?: boolean };

    if (typeof flagged !== "boolean") {
      return res.status(400).json({ message: "flagged (boolean) required" });
    }

    await setFlagged(username, password, mailbox, Number(uid), flagged);
    res.status(200).json({ message: flagged ? "Marked as flagged" : "Unflagged" });
  } catch (err) {
    console.error("flagEmail error:", err);
    res.status(500).json({ message: "Failed to update flag" });
  }
};

export const deleteEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { mailbox, uid } = req.body as { mailbox?: string; uid?: number | string };

    if (!mailbox || uid === undefined) {
      return res.status(400).json({ message: "Mailbox and UID are required" });
    }

    const result = await deleteMail(username, password, mailbox, Number(uid));
    res.status(200).json(result);
  } catch (err) {
    console.error("deleteEmail error:", err);
    res.status(500).json({ message: "Failed to delete mail" });
  }
};
export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const folders = await listFolders(username, password);
    res.json({ folders });
  } catch (err) {
    console.error("getFolders error:", err);
    res.status(500).json({ message: "Failed to load folders" });
  }
};

export const createMailFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { name } = req.body as { name?: string };

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    await createFolder(username, password, name);
    res.status(201).json({ message: "Folder created" });
  } catch (err: any) {
    console.error("createMailFolder error:", err);
    res.status(400).json({ message: err?.message || "Failed to create folder" });
  }
};

export const moveEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { mailbox, uid } = req.params;
    const { target } = req.body as { target?: string };

    if (!target || !target.trim()) {
      return res.status(400).json({ message: "Target folder is required" });
    }

    await moveMail(username, password, mailbox, Number(uid), target);
    res.status(200).json({ message: "Mail moved" });
  } catch (err) {
    console.error("moveEmail error:", err);
    res.status(500).json({ message: "Failed to move mail" });
  }
};
