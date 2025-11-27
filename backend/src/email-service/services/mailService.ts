import { mailTransporter } from "../config/mail.js";
import nodemailer from "nodemailer";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { imapConfig } from "../config/imap.js";

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

export const getInbox = async (username: string) => {
  const connection = await imaps.connect(imapConfig);
  await connection.openBox("INBOX");

  const searchCriteria = ["ALL"];
  const fetchOptions = { bodies: [""], struct: true }; // leer = kompletter Raw-Body

  const messages = await connection.search(searchCriteria, fetchOptions);

  const mails = await Promise.all(
    messages.map(async (msg: any) => {
      const allParts = msg.parts.find((p: any) => p.which === "");
      const parsed = await simpleParser(allParts.body);

      return {
        from: parsed.from?.text || "",
        to: parsed.to?.text || "",
        subject: parsed.subject || "",
        date: parsed.date?.toString() || "",
        text: parsed.text || "",
        html: parsed.html || "",
      };
    })
  );

  await connection.end();
  return mails;
};


export const getSent = async (username: string) => {
  const connection = await imaps.connect(imapConfig);
  await connection.openBox("Sent"); // ggf. "Sent Messages"

  const messages = await connection.search(["ALL"], { bodies: [""], struct: true });

  const mails = await Promise.all(
    messages.map(async (msg: any) => {
      const allParts = msg.parts.find((p: any) => p.which === "");
      const parsed = await simpleParser(allParts.body);

      return {
        from: parsed.from?.text || "",
        to: parsed.to?.text || "",
        subject: parsed.subject || "",
        date: parsed.date?.toString() || "",
        text: parsed.text || "",
        html: parsed.html || "",
      };
    })
  );

  await connection.end();
  return mails;
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
