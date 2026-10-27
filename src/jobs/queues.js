import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Queue, QueueScheduler } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { queueEnabled } from '../lib/runtime.js';

export const QUEUES = {
  MODERATION_CLEANUP: 'moderation-cleanup',
  SEARCH_INDEX: 'search-index',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
  RENEWAL_REMINDER: 'renewal-reminder',
  CONTENT_CLEANUP: 'content-cleanup',
  STATUS_CLEANUP: 'status-cleanup',
  RENEWAL_EXPIRE: 'renewal-cleanup',
  FEEDBACK_REMINDER: 'feedback-reminder',
  BLOG_EXPIRY: 'blog-expiry',
};

const connections = {};
function getConnection() {
  if (!connections.primary) {
    const opts = { maxRetriesPerRequest: null, lazyConnect: false };
    if (config.redisUsername) opts.username = config.redisUsername;
    if (config.redisPassword) opts.password = config.redisPassword;
    connections.primary = config.redisUrl ? new IORedis(config.redisUrl, opts) : new IORedis(opts);
  }
  return connections.primary;
}

function noopQueue() {
  return {
    add: async () => null,
  };
}

export const queues = {};

export async function initQueues() {
  if (!queueEnabled) {
    for (const qName of Object.values(QUEUES)) {
      queues[qName] = noopQueue();
    }
    logger.info('Queues skipped (Redis/BullMQ disabled)');
    return;
  }
  for (const qName of Object.values(QUEUES)) {
    queues[qName] = new Queue(qName, { connection: getConnection() });
    try {
      if (typeof QueueScheduler === 'function') {
        new QueueScheduler(qName, { connection: getConnection() });
      }
    } catch (e) {
      logger.warn({ err: e, queue: qName }, 'QueueScheduler unavailable; continuing without explicit scheduler');
    }
  }
  logger.info('Queues initialized');
}

export async function closeQueues() {
  await Promise.all(Object.values(queues).map((q) => q.close?.()));
  if (connections.primary) {
    await connections.primary.quit();
    delete connections.primary;
  }
}
