import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";


export const mailTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,      // z.B. "mail.jadenk.de"
  port: process.env.MAIL_PORT,      // SMTP Port -> default 587
  secure: false,                    // auf tr54ue setzn wenn TLS/SSL
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});


// TESTING
//curl -X POST http://localhost:5000/api/mail/send -H "Content-Type: application/json" -d '{"from":"Info <info@jadenk.de>","to":"jaden.kasche@gmail.com","subject":"Test","text":"Hello"}'

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
  } catch (err) {
    console.error("Mail Server connection failed", err);
  }
};

