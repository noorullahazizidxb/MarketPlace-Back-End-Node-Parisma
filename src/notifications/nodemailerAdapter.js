import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

export async function sendEmailViaSMTP({ to, subject, text, html = null }) {
  if (!transporter) {
    logger.warn('SMTP transporter not configured');
    throw new Error('SMTP not configured');
  }
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM || 'no-reply@example.com', to, subject, text, html });
  logger.info({ messageId: info.messageId }, 'Email sent');
  return info;
}
