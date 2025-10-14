import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });

// Job data: { cutoff: ISO string or Date, types?: ['story','blog'] }
export const contentCleanupWorker = new Worker('content-cleanup', async (job) => {
  const { cutoff, types } = job.data || {};
  const cutoffDate = cutoff ? new Date(cutoff) : new Date();
  const doStory = !types || types.includes('story');
  const doBlog = !types || types.includes('blog');

  if (doStory) {
    try {
      const oldStories = await prisma.story.findMany({ where: { createdAt: { lt: cutoffDate } } });
      for (const s of oldStories) {
        try { await prisma.storyImage.deleteMany({ where: { storyId: s.id } }); } catch (e) {}
        try { await prisma.story.delete({ where: { id: s.id } }); } catch (e) {}
        try { const { storage } = await import('../utils/storage.js'); storage.deleteDirectory(`uploads/stories/${s.id}`); } catch (e) {}
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
        try { await prisma.blogComment.deleteMany({ where: { blogId: b.id } }); } catch (e) {}
        try { await prisma.blog.delete({ where: { id: b.id } }); } catch (e) {}
        try { const { storage } = await import('../utils/storage.js'); storage.deleteDirectory(`uploads/blogs/${b.id}`); } catch (e) {}
        logger.info({ blogId: b.id }, 'Content cleanup deleted blog');
      }
    } catch (e) {
      logger.warn({ err: e?.message }, 'Content cleanup blogs failed');
    }
  }
}, { connection });

new QueueEvents('content-cleanup', { connection }).on('failed', (e) => logger.error({ e }, 'Content cleanup worker failed'));
