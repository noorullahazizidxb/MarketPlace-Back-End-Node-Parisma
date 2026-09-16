import { Router } from 'express';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { cleanupService } from '../services/cleanupService.js';
import { requireAdmin } from '../middleware/auth.js';
import { storage } from '../utils/storage.js';
import { runtimeSummary } from '../lib/runtime.js';

const router = Router();

function allowCronOrAdmin(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.get('authorization') || req.get('x-cron-secret') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    if (token && token === secret) return next();
  }
  return requireAdmin(req, res, next);
}

async function runInlineCleanup() {
  const unapprovedCutoff = new Date();
  unapprovedCutoff.setDate(unapprovedCutoff.getDate() - (config.retention.unapprovedDays || 2));
  const unapproved = await cleanupService.purgeUnapprovedOlderThan(unapprovedCutoff);

  const contentCutoff = new Date();
  contentCutoff.setDate(contentCutoff.getDate() - (config.retention.contentCleanupDays || 30));
  let stories = 0;
  let blogs = 0;
  try {
    const oldStories = await prisma.story.findMany({ where: { createdAt: { lt: contentCutoff } }, select: { id: true } });
    for (const s of oldStories) {
      try { await prisma.story.delete({ where: { id: s.id } }); } catch { /* ignore */ }
      try { await storage.deleteDirectory(`uploads/stories/${s.id}`); } catch { /* ignore */ }
      stories += 1;
    }
  } catch (e) {
    logger.warn({ err: e?.message }, 'Story cleanup failed');
  }
  try {
    const oldBlogs = await prisma.blog.findMany({
      where: {
        OR: [
          { createdAt: { lt: contentCutoff } },
          { expiresAt: { lte: new Date() } },
        ],
      },
      select: { id: true },
    });
    for (const b of oldBlogs) {
      try { await prisma.blog.delete({ where: { id: b.id } }); } catch { /* ignore */ }
      try { await storage.deleteDirectory(`uploads/blogs/${b.id}`); } catch { /* ignore */ }
      blogs += 1;
    }
  } catch (e) {
    logger.warn({ err: e?.message }, 'Blog cleanup failed');
  }

  return { unapproved, stories, blogs, runtime: runtimeSummary() };
}

async function cleanupExpired(req, res) {
  try {
    const result = await runInlineCleanup();
    logger.info(result, 'Inline cleanup-expired completed');
    if (res.apiSuccess) return res.apiSuccess(result, 'Cleanup complete', 200);
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error(err, 'cleanup-expired failed');
    if (res.apiError) return res.apiError(err.message || 'Cleanup failed', 500);
    return res.status(500).json({ ok: false, error: err.message || 'Cleanup failed' });
  }
}

router.get('/cleanup-expired', allowCronOrAdmin, cleanupExpired);
router.post('/cleanup-expired', allowCronOrAdmin, cleanupExpired);

export default router;
