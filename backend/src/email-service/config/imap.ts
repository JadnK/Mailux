import dotenv from "dotenv";
dotenv.config();

export const getImapConfig = (username: string, password: string) => ({
  imap: {
    user: username,
    // user: username.includes("@")
    //   ? username
    //   : `${username}@${process.env.MAIL_DOMAIN || "jadenk.de"}`,
    password: password,
    host: process.env.MAIL_HOST_IMAP,
    port: Number(process.env.MAIL_IMAP_PORT) || 993,
    tls: true,
    authTimeout: 5000
  }
});

// Legacy config for backward compatibility
export const imapConfig = getImapConfig('info', process.env.MAIL_PASS || '');
