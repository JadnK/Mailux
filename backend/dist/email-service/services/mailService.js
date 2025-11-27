import { mailTransporter } from "../config/mail.js";
import imaps from "imap-simple";
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
    const fetchOptions = {
        bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
        struct: true,
    };
    const mails = await connection.search(searchCriteria, fetchOptions);
    const formatted = mails.map((mail) => {
        const header = mail.parts.find((p) => p.which.includes("HEADER"));
        const body = mail.parts.find((p) => p.which === "TEXT");
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
export const getSent = async (username) => {
    const connection = await imaps.connect(imapConfig);
    // Je nach Dovecot-Config evtl. ändere zu: "Sent Messages", "Gesendet"
    await connection.openBox("Sent");
    const mails = await connection.search(["ALL"], {
        bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
        struct: true,
    });
    const formatted = mails.map((mail) => {
        const header = mail.parts.find((p) => p.which.includes("HEADER"));
        const body = mail.parts.find((p) => p.which === "TEXT");
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
