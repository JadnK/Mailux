import { mailTransporter } from "../config/mail.js";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { imapConfig } from "../config/imap.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const MailComposer = require("nodemailer/lib/mail-composer");

type MailData = Parameters<typeof mailTransporter.sendMail>[0];

// --- Send Mail + speichern in Sent ---
export const sendMail = async (mailData: MailData) => {
  try {
    const info = await mailTransporter.sendMail(mailData);
    console.log("Mail sent:", info.messageId);

    await saveToSent(mailData);

    return info;
  } catch (err) {
    console.error("Error sending mail:", err);
    throw err;
  }
};

export const saveToSent = async (mailData: MailData) => {
  const connection = await imaps.connect(imapConfig);

  try {
    const mail = new MailComposer(mailData);
    const raw = await mail.compile().build();

    await connection.imap.append(raw, { mailbox: "Sent", flags: ["\\Seen"] });
  } finally {
    await connection.end();
  }
};


// --- Inbox abrufen ---
export const getInbox = async (username: string) => {
  const connection = await imaps.connect(imapConfig);
  await connection.openBox("INBOX");

  const searchCriteria = ["ALL"];
  const fetchOptions = { bodies: [""], struct: true };
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

  connection.end();
  return mails;
};

// --- Sent Mails abrufen ---
export const getSent = async (username: string) => {
  const connection = await imaps.connect(imapConfig);
  await connection.openBox("Sent");

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

  connection.end();
  return mails;
};

// --- Reply Mail ---
export const replyMail = async (mailData: MailData) => {
  return await sendMail(mailData);
};

// --- Lokale Ordnerverwaltung ---
let folders: Record<string, string[]> = {};

export const createFolder = (username: string, folderName: string) => {
  if (!folders[username]) folders[username] = [];
  if (!folders[username].includes(folderName)) folders[username].push(folderName);
  return folders[username];
};

export const getFolders = (username: string) => {
  return folders[username] || [];
};
