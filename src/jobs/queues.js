import pkg from 'bullmq';
const { Queue, QueueScheduler } = pkg;
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
    connections.primary = new IORedis(config.redisUrl);
  }
  return connections.primary;
}

export const queues = {};

export async function initQueues() {
  for (const qName of Object.values(QUEUES)) {
    queues[qName] = new Queue(qName, { connection: getConnection() });
    new QueueScheduler(qName, { connection: getConnection() });
  }
  logger.info('Queues initialized');
}
