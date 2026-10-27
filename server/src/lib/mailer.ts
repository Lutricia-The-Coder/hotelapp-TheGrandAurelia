
import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null =
  null;

function getEmailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !password || !from) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in server/.env.",
    );
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    });
  }

  return { transporter, from };
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<void> {
  const { transporter, from } = getEmailTransport();

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}
