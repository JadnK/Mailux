import { getMailTransporter } from "../config/mail.js";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { getImapConfig } from "../config/imap.js";
import { MailData } from "../types/mail.js";
import { getUserSettings } from "../../settings-service/services/settingsService.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const MailComposer = require("nodemailer/lib/mail-composer");


export const sendMail = async (mailData: MailData, username: string, password: string) => {
  try {
    const transporter = getMailTransporter(username, password);
    const userSettings = getUserSettings(username);
    
    const defaultEmail = `${username}@jadenk.de`;
    const displayName = userSettings.name || username;
    const formattedFrom = `"${displayName}" <${defaultEmail}>`;

  const finalMailData: MailData = {
    ...mailData,
    from: mailData.from?.trim() ? mailData.from : formattedFrom,
    replyTo: mailData.replyTo || formattedFrom,
    envelope: {
      ...(mailData.envelope || {}),
      from: mailData.envelope?.from?.trim() ? mailData.envelope.from : formattedFrom,
      to: mailData.envelope?.to || mailData.to,
    },
  };

    await transporter.verify();

    const info = await transporter.sendMail(finalMailData);
    /*console.log("=== SEND INFO ===");
    console.log("messageId:", info.messageId);
    console.log("accepted:", info.accepted);
    console.log("rejected:", info.rejected);
    console.log("response:", info.response);
    console.log("envelope:", info.envelope);
    console.log("=== END SEND INFO ===");*/

    await saveToSent(finalMailData, username, password);
    return info;
  } catch (err) {
    console.error("Error sending mail:", err);
    throw err;
  }
};
export const saveToSent = async (mailData: MailData, username: string, password: string) => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);

  try {
    const mail = new MailComposer(mailData);
    const raw = await mail.compile().build();

    await connection.imap.append(raw, { mailbox: "Sent", flags: ["\\Seen"] });
  } finally {
    await connection.end();
  }
};


export const getInbox = async (username: string, password: string) => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);
  await connection.openBox("INBOX");

  const searchCriteria = ["ALL"];
  const fetchOptions = { bodies: [""], struct: true };
  const messages = await connection.search(searchCriteria, fetchOptions);

  const mails = await Promise.all(
    messages.map(async (msg: any) => {
      const allParts = msg.parts.find((p: any) => p.which === "");
      const parsed = await simpleParser(allParts.body);
      
      const mailData = {
        uid: msg.attributes.uid, // Add UID for deletion
        from: parsed.from?.text || "",
        to: parsed.to?.text || "",
        subject: parsed.subject || "",
        date: parsed.date?.toString() || "",
        text: parsed.text || "",
        html: parsed.html || "",
      };
    
      
      return mailData;
    })
  );

  connection.end();
  
  // Sort by date (newest first)
  return mails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getSent = async (username: string, password: string) => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);
  await connection.openBox("Sent");

  const messages = await connection.search(["ALL"], { bodies: [""], struct: true });

  const mails = await Promise.all(
    messages.map(async (msg: any) => {
      const allParts = msg.parts.find((p: any) => p.which === "");
      const parsed = await simpleParser(allParts.body);
      return {
        uid: msg.attributes.uid, // Add UID for deletion
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
  
  // Sort by date (newest first)
  return mails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const replyMail = async (mailData: MailData, username: string, password: string) => {
  return await sendMail(mailData, username, password);
};

let folders: Record<string, string[]> = {};

export const createFolder = (username: string, folderName: string) => {
  if (!folders[username]) folders[username] = [];
  if (!folders[username].includes(folderName)) folders[username].push(folderName);
  return folders[username];
};

export const getFolders = (username: string) => {
  return folders[username] || [];
};

export const deleteMail = async (username: string, password: string, mailbox: string, mailUid: number) => {
  const imapConfig = getImapConfig(username, password);
  const connection = await imaps.connect(imapConfig);
  
  try {
    await connection.openBox(mailbox);
    
    // Mark the message for deletion
    await connection.addFlags(mailUid, ['\\Deleted']);
    
    // Expunge to permanently delete the message
    await connection.imap.expunge();
    
    return true;
  } catch (error) {
    console.error('Error deleting mail:', error);
    throw error;
  } finally {
    await connection.end();
  }
};