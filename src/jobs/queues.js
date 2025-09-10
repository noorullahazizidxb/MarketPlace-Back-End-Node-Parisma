import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Queue, QueueScheduler } = require('bullmq');
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const QUEUES = {
  MODERATION_CLEANUP: 'moderation-cleanup',
  STATUS_CLEANUP: 'status-cleanup',
  FEEDBACK_REMINDER: 'feedback-reminder',
  SEARCH_INDEX: 'search-index',
  NOTIFICATION_DISPATCH: 'notification-dispatch'
};

const connections = {};
function getConnection() {
  if (!connections.primary) {
  connections.primary = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });
  }
  return connections.primary;
}

export const queues = {};

export async function initQueues() {
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
