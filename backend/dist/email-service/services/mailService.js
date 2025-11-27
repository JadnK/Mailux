import { mailTransporter } from "../config/mail.js";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { imapConfig } from "../config/imap.js";
export const sendMail = async (mailData) => {
    try {
        const info = await mailTransporter.sendMail(mailData);
        console.log("Mail sent:", info.messageId);
        return info;
    }
    catch (err) {
        console.error("Error sending mail:", err);
        throw err;
    }
};
export const getInbox = async (username) => {
    const connection = await imaps.connect(imapConfig);
    await connection.openBox("INBOX");
    const searchCriteria = ["ALL"];
    const fetchOptions = { bodies: [""], struct: true }; // leer = kompletter Raw-Body
    const messages = await connection.search(searchCriteria, fetchOptions);
    const mails = await Promise.all(messages.map(async (msg) => {
        const allParts = msg.parts.find((p) => p.which === "");
        const parsed = await simpleParser(allParts.body);
        return {
            from: parsed.from?.text || "",
            to: parsed.to?.text || "",
            subject: parsed.subject || "",
            date: parsed.date?.toString() || "",
            text: parsed.text || "",
            html: parsed.html || "",
        };
    }));
    await connection.end();
    return mails;
};
export const getSent = async (username) => {
    const connection = await imaps.connect(imapConfig);
    await connection.openBox("Sent"); // ggf. "Sent Messages"
    const messages = await connection.search(["ALL"], { bodies: [""], struct: true });
    const mails = await Promise.all(messages.map(async (msg) => {
        const allParts = msg.parts.find((p) => p.which === "");
        const parsed = await simpleParser(allParts.body);
        return {
            from: parsed.from?.text || "",
            to: parsed.to?.text || "",
            subject: parsed.subject || "",
            date: parsed.date?.toString() || "",
            text: parsed.text || "",
            html: parsed.html || "",
        };
    }));
    await connection.end();
    return mails;
};
export const replyMail = async (mailData) => {
    return await sendMail(mailData);
};
// Ordnerverwaltung (lokal oder DB)
let folders = {};
export const createFolder = (username, folderName) => {
    if (!folders[username])
        folders[username] = [];
    if (!folders[username].includes(folderName))
        folders[username].push(folderName);
    return folders[username];
};
export const getFolders = (username) => {
    return folders[username] || [];
};
