import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { cleanupService } from '../services/cleanupService.js';

async function removeUploadDir(relativeDir) {
  try {
    const { storage } = await import('../utils/storage.js');
    await storage.deleteDirectory(relativeDir);
  } catch (e) {
    logger.warn({ err: e?.message, relativeDir }, 'Failed to delete upload directory');
  }
}

async function notifyUser(userId, event, payload) {
  try {
    const { emitToUser } = await import('../websocket/socket.js');
    emitToUser(userId, event, payload);
  } catch (e) {
    logger.warn({ err: e?.message, userId, event }, 'Failed to emit user notification');
  }
}

export async function runModerationCleanup({ cutoff } = {}) {
  const cutoffDate = cutoff ? new Date(cutoff) : new Date();
  const unapprovedCount = await cleanupService.purgeUnapprovedOlderThan(cutoffDate);
  logger.info({ count: unapprovedCount }, 'Purged unapproved listings');
  const staleCount = await cleanupService.purgeStaleListing();
  logger.info({ count: staleCount }, 'Purged stale listings (daily)');
  return { unapprovedCount, staleCount };
}

export async function runNotificationDispatch({ notificationId } = {}) {
  if (!notificationId) return null;
  const { sendWhatsApp } = await import('../notifications/whatsappAdapter.js');
  const { sendEmail } = await import('../notifications/emailAdapter.js');
  const notification = await prisma.notification.findUnique({ where: { id: notificationId }, include: { recipients: true, listing: true } });
  if (!notification) return null;

  for (const r of notification.recipients) {
    try {
      if (notification.channel === 'WHATSAPP') {
        if (r.userId) {
          const user = await prisma.user.findUnique({ where: { id: r.userId } });
          if (user?.phone) await sendWhatsApp({ toNumber: user.phone, message: notification.message });
        }
      } else if (notification.channel === 'EMAIL') {
        if (r.userId) {
          const user = await prisma.user.findUnique({ where: { id: r.userId } });
          if (user?.email) await sendEmail({ to: user.email, subject: notification.title, text: notification.message });
        }
      }
      await prisma.notificationRecipient.update({ where: { id: r.id }, data: { deliveredAt: new Date() } });
    } catch (e) {
      await prisma.notificationRecipient.update({ where: { id: r.id }, data: { deliveryError: String(e) } });
      logger.error(e, 'Failed to deliver notification to recipient');
    }
  }
  await prisma.notification.update({ where: { id: notificationId }, data: { sentAt: new Date() } });
  logger.info({ notificationId }, 'Dispatched notification (attempted delivery)');
  return { notificationId };
}

export async function runRenewalReminder() {
  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

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
        await notifyUser(listing.userId, 'notification:new', { type: 'AUTO_DRAFT_EXPIRED_TOKEN', listingId: listing.id });
        logger.info({ listingId: listing.id }, 'Auto-drafted listing due to expired token');
      } catch (e) {
        logger.warn({ listingId: listing.id, err: e?.message }, 'Failed auto-draft for expired token');
      }
    }
  }

  const tokensExpiringSoon = await prisma.listingRenewToken.findMany({ where: { expiresAt: { lte: in3days, gt: now } }, include: { listing: true } });
  for (const t of tokensExpiringSoon) {
    const listing = t.listing;
    if (!listing) continue;
    if (listing.status !== 'APPROVED') continue;

    const prevReminders = await prisma.notification.count({ where: { triggerEvent: 'RENEWAL_REMINDER', listingId: listing.id } });
    if (prevReminders >= 3) continue;

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
      await notifyUser(listing.userId, 'notification:new', { type: 'RENEWAL_REMINDER', listingId: listing.id, expiresAt: t.expiresAt });
      logger.info({ listingId: listing.id, reminderCount: prevReminders + 1 }, 'Sent renewal reminder');
    } catch (e) {
      logger.warn({ listingId: listing.id, err: e?.message }, 'Failed to send renewal reminder');
    }
  }
}

export async function runContentCleanup({ cutoff, types } = {}) {
  const cutoffDate = cutoff ? new Date(cutoff) : new Date();
  const doStory = !types || types.includes('story');
  const doBlog = !types || types.includes('blog');

  if (doStory) {
    try {
      const oldStories = await prisma.story.findMany({ where: { createdAt: { lt: cutoffDate } } });
      for (const s of oldStories) {
        try { await prisma.storyImage.deleteMany({ where: { storyId: s.id } }); } catch { /* ignore */ }
        try { await prisma.story.delete({ where: { id: s.id } }); } catch { /* ignore */ }
        await removeUploadDir(`uploads/stories/${s.id}`);
        logger.info({ storyId: s.id }, 'Content cleanup deleted story');
      }
    } catch (e) {
      logger.warn({ err: e?.message }, 'Content cleanup stories failed');
    }
  }

  if (doBlog) {
    try {
      const oldBlogs = await prisma.blog.findMany({ where: { createdAt: { lt: cutoffDate } } });
      for (const b of oldBlogs) {
        try { await prisma.blogComment.deleteMany({ where: { blogId: b.id } }); } catch { /* ignore */ }
        try { await prisma.blog.delete({ where: { id: b.id } }); } catch { /* ignore */ }
        await removeUploadDir(`uploads/blogs/${b.id}`);
        logger.info({ blogId: b.id }, 'Content cleanup deleted blog');
      }
    } catch (e) {
      logger.warn({ err: e?.message }, 'Content cleanup blogs failed');
    }
  }
}

export async function runStatusCleanup() {
  const soldCutoff = new Date();
  soldCutoff.setDate(soldCutoff.getDate() - config.retention.soldRentedCleanupDays);
  const sold = await prisma.listing.findMany({ where: { status: { in: ['SOLD', 'RENTED'] }, updatedAt: { lt: soldCutoff } } });
  for (const l of sold) {
    await removeUploadDir(`uploads/listings/${l.id}`);
    await prisma.listing.delete({ where: { id: l.id } });
    await prisma.auditLog.create({ data: { listingId: l.id, action: 'AUTO_DELETE_SOLD_RENTED', details: { reason: 'retention' } } });
    logger.info({ listingId: l.id }, 'Auto-deleted sold/rented listing');
  }

  const draftCutoff = new Date();
  draftCutoff.setDate(draftCutoff.getDate() - config.retention.draftCleanupDays);
  const drafts = await prisma.listing.findMany({ where: { status: 'DRAFT', updatedAt: { lt: draftCutoff } } });
  for (const d of drafts) {
    await removeUploadDir(`uploads/listings/${d.id}`);
    await prisma.listing.delete({ where: { id: d.id } });
    await prisma.auditLog.create({ data: { listingId: d.id, action: 'AUTO_DELETE_DRAFT', details: { reason: 'retention' } } });
    logger.info({ listingId: d.id }, 'Auto-deleted stale draft');
  }

  const expiredCutoff = new Date();
  expiredCutoff.setDate(expiredCutoff.getDate() - config.retention.soldRentedCleanupDays);
  const expired = await prisma.listing.findMany({ where: { status: 'EXPIRED', updatedAt: { lt: expiredCutoff } } });
  for (const row of expired) {
    await removeUploadDir(`uploads/listings/${row.id}`);
    await prisma.listing.delete({ where: { id: row.id } });
    await prisma.auditLog.create({ data: { listingId: row.id, action: 'AUTO_DELETE_EXPIRED', details: { reason: 'retention' } } });
    logger.info({ listingId: row.id }, 'Auto-deleted expired listing');
  }
}

export async function runRenewalExpire() {
  const now = new Date();
  const expired = await prisma.listing.findMany({ where: { expiresAt: { lt: now }, status: { not: 'EXPIRED' } } });
  for (const l of expired) {
    await prisma.listing.update({ where: { id: l.id }, data: { status: 'EXPIRED' } });
    await prisma.auditLog.create({ data: { listingId: l.id, action: 'MARK_EXPIRED', details: {} } });
    logger.info({ listingId: l.id }, 'Marked listing as EXPIRED');
  }
}

export async function runFeedbackReminder() {
  const reminderCutoff = new Date();
  reminderCutoff.setDate(reminderCutoff.getDate() - config.retention.feedbackReminderDays);

  const listings = await prisma.listing.findMany({ where: { status: { in: ['SOLD', 'RENTED'] }, soldOrRentedAt: { lt: reminderCutoff } } });
  for (const l of listings) {
    await prisma.notification.create({
      data: {
        title: 'Please provide feedback',
        message: `Please provide feedback for your listing ${l.title}`,
        channel: 'SYSTEM',
        targetType: 'USER',
        listingId: l.id,
        recipients: { create: [{ userId: l.userId }] }
      }
    });
    logger.info({ listingId: l.id }, 'Created feedback reminder notification');
  }
}

export async function runBlogExpiry() {
  const now = new Date();
  const notifyDays = config.retention.blogRenewalNotifyDays || 7;
  const notifyThreshold = new Date(now.getTime() + notifyDays * 24 * 60 * 60 * 1000);

  const approachingExpiry = await prisma.blog.findMany({
    where: {
      status: 'APPROVED',
      expiresAt: { gt: now, lte: notifyThreshold },
    },
    select: { id: true, title: true, authorId: true, expiresAt: true },
  });

  for (const blog of approachingExpiry) {
    try {
      const daysLeft = Math.ceil((new Date(blog.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const notification = await prisma.notification.create({
        data: {
          title: 'Your blog is expiring soon',
          message: `Your blog "${blog.title}" will expire in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew it to keep it visible.`,
          channel: 'SYSTEM',
          targetType: 'USER',
          triggerEvent: 'BLOG_EXPIRY_REMINDER',
          recipients: { create: [{ userId: blog.authorId }] },
        },
        include: { recipients: true },
      });
      await notifyUser(blog.authorId, 'notification:new', notification);
      logger.info({ blogId: blog.id, daysLeft }, 'Blog expiry reminder sent');
    } catch (e) {
      logger.error({ err: e?.message, blogId: blog.id }, 'Failed to create blog expiry reminder');
    }
  }

  const expiredBlogs = await prisma.blog.findMany({
    where: {
      expiresAt: { lte: now },
      status: { not: 'PENDING' },
    },
    select: { id: true, title: true, authorId: true },
  });

  for (const blog of expiredBlogs) {
    try {
      await prisma.blog.delete({ where: { id: blog.id } });
      await removeUploadDir(`uploads/blogs/${blog.id}`);
      try {
        const notification = await prisma.notification.create({
          data: {
            title: 'Your blog has been removed',
            message: `Your blog "${blog.title}" has expired and been automatically removed. You can publish a new one anytime.`,
            channel: 'SYSTEM',
            targetType: 'USER',
            triggerEvent: 'BLOG_EXPIRED_DELETED',
            recipients: { create: [{ userId: blog.authorId }] },
          },
          include: { recipients: true },
        });
        await notifyUser(blog.authorId, 'notification:new', notification);
      } catch (e) {
        logger.warn({ err: e?.message, blogId: blog.id }, 'Failed to notify owner of blog deletion');
      }
      logger.info({ blogId: blog.id }, 'Expired blog auto-deleted');
    } catch (e) {
      logger.error({ err: e?.message, blogId: blog.id }, 'Failed to auto-delete expired blog');
    }
  }

  logger.info({ notified: approachingExpiry.length, deleted: expiredBlogs.length }, 'Blog expiry check complete');
  return { notified: approachingExpiry.length, deleted: expiredBlogs.length };
}

export async function runSearchIndex({ listingId, force } = {}) {
  if (!listingId || !config.elastic.enabled) return null;
  const { getES } = await import('../search/elasticsearch.js');
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { images: true, category: true, user: true, representatives: { include: { representative: true } } } });
  if (!listing) return null;
  if (listing.status !== 'APPROVED' && !force) {
    logger.debug({ listingId }, 'Skipping indexing of non-approved listing');
    return null;
  }

  const client = getES();
  const indexName = config.elastic.index;
  const payload = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category?.slug ?? null,
    listingType: listing.listingType,
    status: listing.status,
    price: Number(listing.price),
    currency: listing.currency,
    location: listing.location,
    address: listing.address,
    userId: listing.userId,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt
  };

  await client.index({ index: indexName, id: listing.id, document: payload });
  await client.indices.refresh({ index: indexName });
  logger.info({ listingId }, 'Indexed listing into Elasticsearch');
  return { listingId };
}
