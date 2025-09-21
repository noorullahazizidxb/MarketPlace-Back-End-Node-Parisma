import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });

// This worker runs daily and:
// - finds listings whose renew token expires within next 3 days
// - sends a notification each day for up to 3 days
// - after 3 days from first notification, stall the listing (custom flag) and set status to DRAFT
export const renewalReminderWorker = new Worker('renewal-reminder', async (job) => {
  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // 1. Draft any listings whose token already expired (single pass)
  const expiredTokens = await prisma.listingRenewToken.findMany({ where: { expiresAt: { lt: now } }, include: { listing: true } });
  for (const t of expiredTokens) {
    const listing = t.listing;
    if (!listing) continue;
    if (listing.status !== 'DRAFT') {
      try {
        await prisma.listing.update({ where: { id: listing.id }, data: { status: 'DRAFT', metadata: { ...(listing.metadata || {}), autoDraftedAt: now } } });
        await prisma.auditLog.create({ data: { listingId: listing.id, action: 'AUTO_DRAFT_EXPIRED_TOKEN', details: { prevStatus: listing.status } } });
        await prisma.notification.create({
          data: {
            title: 'Listing moved to draft (expired)',
            message: `Your listing "${listing.title}" was moved to DRAFT because the renewal token expired. You can renew by editing and resubmitting it.`,
            channel: 'SYSTEM',
            targetType: 'USER',
            listingId: listing.id,
            triggerEvent: 'AUTO_DRAFT_EXPIRED_TOKEN',
            recipients: { create: [{ userId: listing.userId }] }
          }
        });
        try { const { emitToUser } = await import('../websocket/socket.js'); emitToUser(listing.userId, 'notification:new', { type: 'AUTO_DRAFT_EXPIRED_TOKEN', listingId: listing.id }); } catch (e) {}
        logger.info({ listingId: listing.id }, 'Auto-drafted listing due to expired token');
      } catch (e) {
        logger.warn({ listingId: listing.id, err: e?.message }, 'Failed auto-draft for expired token');
      }
    }
  }

  // 2. Send reminders for tokens expiring within 3 days (up to 3 reminders)
  const tokensExpiringSoon = await prisma.listingRenewToken.findMany({ where: { expiresAt: { lte: in3days, gt: now } }, include: { listing: true } });
  for (const t of tokensExpiringSoon) {
    const listing = t.listing;
    if (!listing) continue;
    if (listing.status !== 'APPROVED') continue; // Only remind for active approved listings

    const prevReminders = await prisma.notification.count({ where: { triggerEvent: 'RENEWAL_REMINDER', listingId: listing.id } });
    if (prevReminders >= 3) continue; // already sent max reminders; drafting handled when actually expired above

    try {
      await prisma.notification.create({
        data: {
          title: 'Listing renewal expiring soon',
          message: `Your renewal window for "${listing.title}" ends on ${t.expiresAt.toISOString()}. Renew now to keep it active.`,
          channel: 'SYSTEM',
          targetType: 'USER',
          listingId: listing.id,
          triggerEvent: 'RENEWAL_REMINDER',
          recipients: { create: [{ userId: listing.userId }] }
        }
      });
      try { const { emitToUser } = await import('../websocket/socket.js'); emitToUser(listing.userId, 'notification:new', { type: 'RENEWAL_REMINDER', listingId: listing.id, expiresAt: t.expiresAt }); } catch (e) {}
      logger.info({ listingId: listing.id, reminderCount: prevReminders + 1 }, 'Sent renewal reminder');
    } catch (e) {
      logger.warn({ listingId: listing.id, err: e?.message }, 'Failed to send renewal reminder');
    }
  }
}, { connection });

new QueueEvents('renewal-reminder', { connection }).on('failed', (e) => logger.error({ e }, 'Renewal reminder failed'));
