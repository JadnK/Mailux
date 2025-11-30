import { Request, Response } from "express";
import { sendMail, getInbox, getSent, replyMail, createFolder, getFolders, deleteMail } from "../services/mailService.js";
import jwt from "jsonwebtoken";

const getUserCredentialsFromToken = (req: Request): { username: string; password: string } => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error('No authorization header');
  }
  
  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    throw new Error('No token provided');
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey") as { username: string; password: string };
  return {
    username: decoded.username,
    password: decoded.password
  };
};

export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { username, password } = getUserCredentialsFromToken(req);
    const info = await sendMail(req.body, username, password);
    res.status(200).json({ message: "Mail sent", id: info.messageId });
  } catch (err) {
    res.status(500).json({ message: "Failed to send mail", error: err });
  }
};

export const getInboxMails = async (req: Request, res: Response) => {
  try {
    const { username, password } = getUserCredentialsFromToken(req);
    const mails = await getInbox(username, password);
    res.json(mails);
  } catch (err) {
    res.status(500).json({ message: "Failed to get inbox mails", error: err });
  }
};

export const getSentMails = async (req: Request, res: Response) => {
  try {
    const { username, password } = getUserCredentialsFromToken(req);
    const mails = await getSent(username, password);
    res.json(mails);
  } catch (err) {
    res.status(500).json({ message: "Failed to get sent mails", error: err });
  }
};

export const replyEmail = async (req: Request, res: Response) => {
  try {
    const { username, password } = getUserCredentialsFromToken(req);
    const info = await replyMail(req.body, username, password);
    res.status(200).json({ message: "Reply sent", id: info.messageId });
  } catch (err) {
    res.status(500).json({ message: "Failed to reply", error: err });
  }
};

export const addFolder = (req: Request, res: Response) => {
  try {
    const { username, password } = getUserCredentialsFromToken(req);
    const { folderName } = req.body;
    const updatedFolders = createFolder(username, folderName);
    res.json(updatedFolders);
  } catch (err) {
    res.status(500).json({ message: "Failed to add folder", error: err });
  }
};

export const listFolders = (req: Request, res: Response) => {
  try {
    const { username, password } = getUserCredentialsFromToken(req);
    const userFolders = getFolders(username);
    res.json(userFolders);
  } catch (err) {
    res.status(500).json({ message: "Failed to list folders", error: err });
  }
};

export const deleteEmail = async (req: Request, res: Response) => {
  try {
    const { username, password } = getUserCredentialsFromToken(req);
    const { mailbox, uid } = req.body;
    
    if (!mailbox || !uid) {
      return res.status(400).json({ message: "Mailbox and UID are required" });
    }
    
    await deleteMail(username, password, mailbox, uid);
    res.status(200).json({ message: "Mail deleted successfully" });
  } catch (err) {
    console.error("Error deleting mail:", err);
    res.status(500).json({ message: "Failed to delete mail", error: err });
  }
};