// Email adapter stub. Replace with real SMTP or transactional provider (SendGrid, SES) implementation.
import { logger } from '../utils/logger.js';
import { sendEmailViaSMTP } from './nodemailerAdapter.js';

export async function sendEmail({ to, subject, text, html = null }) {
  try {
    return await sendEmailViaSMTP({ to, subject, text, html });
  } catch (e) {
    logger.warn({ err: e.message }, 'SMTP not configured, email not sent (stub)');
    return { ok: false, reason: e.message };
  }
}
