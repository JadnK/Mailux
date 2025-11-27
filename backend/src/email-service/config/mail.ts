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

export const testConnection = async () => {
    try {
        await mailTransporter.verify();
        console.log("Mail server is ready!");
    } catch (err) {
        console.error("Mail Server connection failed", err);
    }
}
