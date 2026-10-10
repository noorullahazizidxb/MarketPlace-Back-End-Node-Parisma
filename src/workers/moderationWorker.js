import { startQueueWorker } from '../jobs/bullmq.js';
import { runModerationCleanup } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('moderation-cleanup', (data) => runModerationCleanup(data));
  return worker;
}

export { worker as moderationWorker };
