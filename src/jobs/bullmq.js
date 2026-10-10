import { createRequire } from 'module';
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');

export function createRedisConnection() {
  const opts = { maxRetriesPerRequest: null, lazyConnect: false };
  if (config.redisUsername) opts.username = config.redisUsername;
  if (config.redisPassword) opts.password = config.redisPassword;
  return new IORedis(config.redisUrl, opts);
}

export function startQueueWorker(queueName, processor) {
  const connection = createRedisConnection();
  const worker = new Worker(queueName, async (job) => processor(job.data || {}, job), { connection });
  new QueueEvents(queueName, { connection }).on('failed', (event) => {
    logger.error({ event, queue: queueName }, 'Queue worker failed');
  });
  return worker;
}
