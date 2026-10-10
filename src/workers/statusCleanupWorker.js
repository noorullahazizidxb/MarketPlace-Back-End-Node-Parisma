import { startQueueWorker } from '../jobs/bullmq.js';
import { runStatusCleanup } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('status-cleanup', () => runStatusCleanup());
  return worker;
}

export { worker as statusCleanupWorker };
