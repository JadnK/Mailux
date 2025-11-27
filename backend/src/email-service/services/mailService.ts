import { mailTransporter } from "../config/mail.js";
import nodemailer from "nodemailer";

type MailData = Parameters<typeof mailTransporter.sendMail>[0];

export const sendMail = async (mailData: MailData) => {
  try {
    const info = await mailTransporter.sendMail(mailData);
    console.log("Mail sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending mail:", err);
    throw err;
  }
};
// Dummy-Funktionen für getInbox/getSent
// In einer echten Implementation würdest du IMAP/Postfix Logs nutzen oder eine DB
export const getInbox = async (username: string) => {
  return []; // return emails
};

export const getSent = async (username: string) => {
  return []; // return emails
};

export const replyMail = async (mailData: MailData) => {
  return await sendMail(mailData);
};

// Ordnerverwaltung (lokal oder DB)
let folders: Record<string, string[]> = {};

export const createFolder = (username: string, folderName: string) => {
  if (!folders[username]) folders[username] = [];
  if (!folders[username].includes(folderName)) folders[username].push(folderName);
  return folders[username];
};

export const getFolders = (username: string) => {
  return folders[username] || [];
};
