import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
  host: "mail.jadenk.de",      // z.B. "mail.jadenk.de"
  port: 587,                   // SMTP Port -> default 587
  secure: false,               // auf true setzn wenn TLS/SSL
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
