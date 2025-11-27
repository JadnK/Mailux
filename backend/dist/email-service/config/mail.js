import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
console.log("MAIL_HOST:", process.env.MAIL_HOST);
console.log("MAIL_PORT:", process.env.MAIL_PORT);
console.log("MAIL_USER:", process.env.MAIL_USER);
console.log("MAIL_PASS:", process.env.MAIL_PASS ? "*****" : undefined); // Passwort nicht im Klartext ausgeben
export const mailTransporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST, // z.B. "mail.jadenk.de"
    port: process.env.MAIL_PORT, // SMTP Port -> default 587
    secure: false, // auf true setzn wenn TLS/SSL
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});
export const testConnection = async () => {
    try {
        console.log("Transporter options:", {
            host: mailTransporter.options.host,
            port: mailTransporter.options.port,
            secure: mailTransporter.options.secure,
            authUser: mailTransporter.options.auth?.user,
            authPassSet: !!mailTransporter.options.auth?.pass, // Passwort nicht direkt ausgeben
        });
        await mailTransporter.verify();
        console.log("Mail server is ready!");
    }
    catch (err) {
        console.error("Mail Server connection failed", err);
    }
};
