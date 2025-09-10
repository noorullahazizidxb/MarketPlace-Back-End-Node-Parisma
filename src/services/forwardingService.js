import { representativeRepository } from '../repositories/representativeRepository.js';
import { sendWhatsApp } from '../notifications/whatsappAdapter.js';
import { prisma } from '../config/prisma.js';

export const forwardingService = {
  async forwardToRepresentatives({ listingId, region, buyerMessage, buyerContact }) {
    // pick active reps in region
    const reps = await representativeRepository.listByRegion(region);
    const results = [];
    for (const r of reps) {
      const msg = `New inquiry for listing ${listingId}: ${buyerMessage} -- contact: ${buyerContact}`;
      const res = await sendWhatsApp({ toNumber: r.whatsappNumber, message: msg });
      results.push({ repId: r.id, whatsapp: r.whatsappNumber, result: res });

      // record audit/notification
      await prisma.auditLog.create({ data: { listingId: listingId, action: 'FORWARDED_TO_REP', details: { repId: r.id, contact: buyerContact } } });
    }
    return results;
  }
};
