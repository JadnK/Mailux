import dotenv from "dotenv";
dotenv.config();

export const imapConfig = {
  imap: {
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASS,
    host: process.env.MAIL_HOST_IMAP,
    port: Number(process.env.MAIL_IMAP_PORT) || 993,
    tls: true,
    authTimeout: 5000
  }
};
