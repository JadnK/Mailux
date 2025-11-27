import { mailTransporter } from "../config/mail.js";
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
// Dummy-Funktionen für getInbox/getSent
// In einer echten Implementation würdest du IMAP/Postfix Logs nutzen oder eine DB
export const getInbox = async (username) => {
    return []; // return emails
};
export const getSent = async (username) => {
    return []; // return emails
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
