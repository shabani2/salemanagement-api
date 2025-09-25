// file: src/Utils/emailService.ts
import nodemailer from "nodemailer";

const user = process.env.GMAIL_USER ?? "shabanibernard1@gmail.com";
const pass = process.env.GMAIL_APP_PASSWORD ?? "mfwr dbby ovsm eszg";

// if (!user || !pass) {
//   console.warn("[emailService] GMAIL_USER / GMAIL_APP_PASSWORD manquants.");
// }

const SMTP_DEBUG = String(process.env.SMTP_DEBUG || "").trim() === "1";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,           // TLS direct
  auth: { user, pass },
  logger: SMTP_DEBUG,
  debug: SMTP_DEBUG,
});

let verifiedOnce = false;

export async function sendEmail(to: string, subject: string, html: string) {
  if (!user || !pass) throw new Error("[emailService] Config Gmail incomplète.");

  // Vérifier une seule fois la connexion SMTP
  if (!verifiedOnce) {
    await transporter.verify();
    verifiedOnce = true;
    // console.log("[emailService] SMTP verified OK -> Gmail");
  }

  // ⚠️ "from" doit être l’adresse Gmail, ou un alias validé dans Gmail
  const from = (process.env.MAIL_FROM || "").trim() || user;
  const replyTo = (process.env.MAIL_REPLY_TO || "").trim() || undefined;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000),
    replyTo,
  });

  // console.log("[emailService] messageId:", info.messageId);
  // if (info.accepted?.length) console.log("[emailService] accepted:", info.accepted);
  // if (info.rejected?.length) console.warn("[emailService] rejected:", info.rejected);

  return info;
}
