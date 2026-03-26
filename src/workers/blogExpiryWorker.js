/**
 * blogExpiryWorker.js
 *
 * Runs daily (DAILY_BLOG_EXPIRY_CHECK_TIME, default 05:00).
 *
 * Two-phase logic:
 *  Phase 1 — Notify approaching expiry:
 *    Find APPROVED blogs where expiresAt is within NOTIFY_BLOG_OWNER_TO_RENEW_DAYS.
 *    Send one SYSTEM notification per day to the blog owner until the blog is renewed or expires.
 *
 *  Phase 2 — Delete expired blogs:
 *    Find blogs where expiresAt <= now.
 *    Hard-delete the blog along with all its comments, and any uploaded files.
 *    Notify the owner that the blog was automatically removed.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { emitToUser } from '../websocket/socket.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });

export const blogExpiryWorker = new Worker('blog-expiry', async (job) => {
  const now = new Date();
  const notifyDays = config.retention.blogRenewalNotifyDays || 7;

  // ─── Phase 1: Notify owners whose blog is approaching expiry ───────────────
  const notifyThreshold = new Date(now.getTime() + notifyDays * 24 * 60 * 60 * 1000);

  const approachingExpiry = await prisma.blog.findMany({
    where: {
      status: 'APPROVED',
      expiresAt: {
        gt: now,
        lte: notifyThreshold,
      },
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

      // Real-time push to the blog author
      try {
        emitToUser(blog.authorId, 'notification:new', notification);
      } catch (e) {
        logger.warn({ err: e?.message, blogId: blog.id }, 'Failed to emit blog-expiry notification');
      }

      logger.info({ blogId: blog.id, daysLeft }, 'Blog expiry reminder sent');
    } catch (e) {
      logger.error({ err: e?.message, blogId: blog.id }, 'Failed to create blog expiry reminder');
    }
  }

  // ─── Phase 2: Delete blogs that have reached their expiry date ─────────────
  const expiredBlogs = await prisma.blog.findMany({
    where: {
      expiresAt: { lte: now },
      status: { not: 'PENDING' }, // never auto-delete pending — admin must review
    },
    select: { id: true, title: true, authorId: true },
  });

  for (const blog of expiredBlogs) {
    try {
      // Hard-delete: Prisma cascades delete BlogComment, but we also delete files
      await prisma.blog.delete({ where: { id: blog.id } });

      // Remove uploaded images from disk
      try {
        const { storage } = await import('../utils/storage.js');
        storage.deleteDirectory(`uploads/blogs/${blog.id}`);
      } catch (e) {
        logger.warn({ err: e?.message, blogId: blog.id }, 'Failed to remove blog upload directory');
      }

      // Notify author that blog was auto-deleted
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
        emitToUser(blog.authorId, 'notification:new', notification);
      } catch (e) {
        logger.warn({ err: e?.message, blogId: blog.id }, 'Failed to notify owner of blog deletion');
      }

      logger.info({ blogId: blog.id }, 'Expired blog auto-deleted');
    } catch (e) {
      logger.error({ err: e?.message, blogId: blog.id }, 'Failed to auto-delete expired blog');
    }
  }

  logger.info({ notified: approachingExpiry.length, deleted: expiredBlogs.length }, 'Blog expiry check complete');
}, { connection });

new QueueEvents('blog-expiry', { connection }).on('failed', (e) => logger.error({ e }, 'Blog expiry worker failed'));
