// WhatsApp adapter stub. Replace sendViaProvider implementation with real provider SDK (e.g., Twilio/WhatsApp Cloud API)
import { logger } from '../utils/logger.js';
import { sendWhatsAppViaTwilio } from './twilioAdapter.js';

export async function sendWhatsApp({ toNumber, message, media = null }) {
  // Use Twilio when configured
  try {
    return await sendWhatsAppViaTwilio({ toNumber, message, media });
  } catch (e) {
    logger.warn({ err: e.message }, 'Twilio not available, falling back to stubbed WhatsApp (no-op)');
    // fallback no-op: log and pretend delivered
    logger.info({ toNumber, message, media }, 'Stub: sendWhatsApp called (no-op)');
    return { ok: true };
  }
}

export function providerConfigPlaceholder() {
  return {
    info: 'Set Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and WHATSAPP_FROM in .env'
  };
}
