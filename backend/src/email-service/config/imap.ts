import { env } from "../../config/env.js";

export const getImapConfig = (username: string, password: string) => ({
  imap: {
    user: username,
    password,
    host: env.imap.host,
    port: env.imap.port,
    tls: true,
    authTimeout: 5000,
  },
});
