import Twilio from 'twilio';
import { logger } from '../utils/logger.js';

let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function sendWhatsAppViaTwilio({ toNumber, message, media = null }) {
  if (!client || !process.env.WHATSAPP_FROM) {
    logger.warn('Twilio or WHATSAPP_FROM not configured');
    throw new Error('Twilio not configured');
  }
  const from = `whatsapp:${process.env.WHATSAPP_FROM}`;
  const to = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;
  const payload = { from, to, body: message };
  if (media) payload.mediaUrl = Array.isArray(media) ? media : [media];
  const res = await client.messages.create(payload);
  logger.info({ sid: res.sid, to }, 'Sent WhatsApp via Twilio');
  return res;
}
