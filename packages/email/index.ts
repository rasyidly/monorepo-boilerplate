import nodemailer from "nodemailer";
import { logger } from '@repo/logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "⚠️  SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Email will be logged only."
    );
    transporter = {
      sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
        logger.email.debug(`to: ${mailOptions.to}, subject: ${mailOptions.subject}`);
        return { messageId: "logged-only" };
      },
    } as unknown as nodemailer.Transporter;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  transporter.verify((err) => {
    if (err) {
      logger.email.error(`SMTP connection failed: ${err.message}`);
    }
  });

  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  let from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@cekstatus.id";

  if (!from.includes("<")) {
    from = `"CekStatus" <${from}>`;
  }

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!hasSmtp) {
    await getTransporter().sendMail(mailOptions);
    return;
  }

  try {
    const info = await getTransporter().sendMail(mailOptions);
    logger.email.info(`Email sent to ${options.to}: ${info.messageId}`);
  } catch (err) {
    throw err;
  }
}
