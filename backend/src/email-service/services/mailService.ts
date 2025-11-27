import { mailTransporter } from "../config/mail.js";
import nodemailer from "nodemailer";
import imaps from "imap-simple";
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
  const fetchOptions = {
    bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
    struct: true,
  };

  const mails = await connection.search(searchCriteria, fetchOptions);

  const formatted = mails.map((mail: any) => {
    const header = mail.parts.find((p: any) => p.which.includes("HEADER"));
    const body = mail.parts.find((p: any) => p.which === "TEXT");

    return {
      from: header.body.from?.[0],
      to: header.body.to?.[0],
      subject: header.body.subject?.[0],
      date: header.body.date?.[0],
      text: body?.body || "",
    };
  });

  await connection.end();

  return formatted;
};

export const getSent = async (username: string) => {
  const connection = await imaps.connect(imapConfig);

  // Je nach Dovecot-Config evtl. "Sent Messages", "Gesendet"
  await connection.openBox("Sent");

  const mails = await connection.search(["ALL"], {
    bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
    struct: true,
  });

  const formatted = mails.map((mail: any) => {
    const header = mail.parts.find((p: any) => p.which.includes("HEADER"));
    const body = mail.parts.find((p: any) => p.which === "TEXT");

    return {
      from: header.body.from?.[0],
      to: header.body.to?.[0],
      subject: header.body.subject?.[0],
      date: header.body.date?.[0],
      text: body?.body || "",
    };
  });

  await connection.end();

  return formatted;
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
