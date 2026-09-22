import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

export const getMailTransporter = (username: string, password: string) =>
  nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    // Port 465 is implicit TLS; everything else (587/25) uses STARTTLS.
    secure: env.smtp.port === 465,
    auth: {
      user: username,
      pass: password,
    },
  });
