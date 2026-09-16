import { queueEnabled, searchEnabled } from '../lib/runtime.js';
import { logger } from '../utils/logger.js';

export async function registerWorkers() {
  if (!queueEnabled) {
    logger.info('BullMQ workers skipped (queues disabled)');
    return;
  }
  const loaders = [
    import('./moderationWorker.js'),
    import('./notificationWorker.js'),
    import('./renewalReminderWorker.js'),
    import('./contentCleanupWorker.js'),
    import('./statusCleanupWorker.js'),
    import('./renewalCleanupWorker.js'),
    import('./feedbackWorker.js'),
    import('./blogExpiryWorker.js'),
  ];
  if (searchEnabled) loaders.push(import('./searchWorker.js'));
  await Promise.all(loaders);
  logger.info('BullMQ workers registered');
}
