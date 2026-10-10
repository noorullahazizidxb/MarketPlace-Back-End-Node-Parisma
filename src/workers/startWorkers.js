import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const WORKER_MODULES = [
  './moderationWorker.js',
  './notificationWorker.js',
  './renewalReminderWorker.js',
  './contentCleanupWorker.js',
  './statusCleanupWorker.js',
  './renewalCleanupWorker.js',
  './feedbackWorker.js',
  './blogExpiryWorker.js',
];

export async function startBackgroundWorkers() {
  if (!config.workers.enabled) {
    logger.info('Background workers disabled');
    return;
  }
  for (const specifier of WORKER_MODULES) {
    const mod = await import(specifier);
    mod.start();
  }
  if (config.elastic.enabled) {
    const search = await import('./searchWorker.js');
    search.start();
  }
  logger.info('Background workers started');
}
