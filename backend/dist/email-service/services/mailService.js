import { mailTransporter } from "../config/mail.js";
export async function sendMail(to, subject, html) {
    try {
        const info = await mailTransporter.sendMail({
            from: process.env.MAIL_USER,
            to,
            subject,
            html,
        });
        console.log("Mail sent:", info.messageId);
        return info;
    }
    catch (error) {
        console.error("Error sending mail:", error);
        throw error;
    }
}
