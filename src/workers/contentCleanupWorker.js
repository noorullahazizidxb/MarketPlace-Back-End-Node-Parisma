import { startQueueWorker } from '../jobs/bullmq.js';
import { runContentCleanup } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('content-cleanup', (data) => runContentCleanup(data));
  return worker;
}

export { worker as contentCleanupWorker };
