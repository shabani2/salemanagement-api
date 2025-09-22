import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  // Pourquoi: éviter fuite d’erreurs SMTP non gérées
  await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Agricap" <no-reply@agricap.app>',
    to,
    subject,
    html,
  });
}
