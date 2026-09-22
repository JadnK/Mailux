import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.js";
import {
  sendMail,
  getInbox,
  getSent,
  replyMail,
  createFolder,
  getFolders,
  deleteMail,
} from "../services/mailService.js";

function credentials(req: AuthRequest): { username: string; password: string } {
  if (!req.user) {
    throw new Error("Not authenticated");
  }
  return req.user;
}

export const sendEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const info = await sendMail(req.body, username, password);
    res.status(200).json({ message: "Mail sent", id: info.messageId });
  } catch (err) {
    console.error("sendEmail error:", err);
    res.status(500).json({ message: "Failed to send mail" });
  }
};

export const getInboxMails = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const mails = await getInbox(username, password);
    res.json(mails);
  } catch (err) {
    console.error("getInboxMails error:", err);
    res.status(500).json({ message: "Failed to get inbox mails" });
  }
};

export const getSentMails = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const mails = await getSent(username, password);
    res.json(mails);
  } catch (err) {
    console.error("getSentMails error:", err);
    res.status(500).json({ message: "Failed to get sent mails" });
  }
};

export const replyEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const info = await replyMail(req.body, username, password);
    res.status(200).json({ message: "Reply sent", id: info.messageId });
  } catch (err) {
    console.error("replyEmail error:", err);
    res.status(500).json({ message: "Failed to reply" });
  }
};

export const addFolder = (req: AuthRequest, res: Response) => {
  try {
    const { username } = credentials(req);
    const { folderName } = req.body as { folderName?: string };

    if (!folderName) {
      return res.status(400).json({ message: "folderName is required" });
    }

    const updatedFolders = createFolder(username, folderName);
    res.json(updatedFolders);
  } catch (err) {
    console.error("addFolder error:", err);
    res.status(500).json({ message: "Failed to add folder" });
  }
};

export const listFolders = (req: AuthRequest, res: Response) => {
  try {
    const { username } = credentials(req);
    const userFolders = getFolders(username);
    res.json(userFolders);
  } catch (err) {
    console.error("listFolders error:", err);
    res.status(500).json({ message: "Failed to list folders" });
  }
};

export const deleteEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = credentials(req);
    const { mailbox, uid } = req.body as { mailbox?: string; uid?: number | string };

    if (!mailbox || uid === undefined) {
      return res.status(400).json({ message: "Mailbox and UID are required" });
    }

    await deleteMail(username, password, mailbox, Number(uid));
    res.status(200).json({ message: "Mail deleted successfully" });
  } catch (err) {
    console.error("deleteEmail error:", err);
    res.status(500).json({ message: "Failed to delete mail" });
  }
};
