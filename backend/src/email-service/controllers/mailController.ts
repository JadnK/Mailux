import { Request, Response } from "express";
import { sendMail, getInbox, getSent, replyMail, createFolder, getFolders } from "../services/mailService.js";

export const sendEmail = async (req: Request, res: Response) => {
  try {
    const info = await sendMail(req.body);
    res.status(200).json({ message: "Mail sent", id: info.messageId });
  } catch (err) {
    res.status(500).json({ message: "Failed to send mail", error: err });
  }
};

export const getInboxMails = async (req: Request, res: Response) => {
  const mails = await getInbox(req.params.username);
  res.json(mails);
};

export const getSentMails = async (req: Request, res: Response) => {
  const mails = await getSent(req.params.username);
  res.json(mails);
};

export const replyEmail = async (req: Request, res: Response) => {
  try {
    const info = await replyMail(req.body);
    res.status(200).json({ message: "Reply sent", id: info.messageId });
  } catch (err) {
    res.status(500).json({ message: "Failed to reply", error: err });
  }
};

export const addFolder = (req: Request, res: Response) => {
  const { username, folderName } = req.body;
  const updatedFolders = createFolder(username, folderName);
  res.json(updatedFolders);
};

export const listFolders = (req: Request, res: Response) => {
  const { username } = req.params;
  const userFolders = getFolders(username);
  res.json(userFolders);
};
