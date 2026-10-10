import { startQueueWorker } from '../jobs/bullmq.js';
import { runRenewalExpire } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('renewal-cleanup', () => runRenewalExpire());
  return worker;
}

export { worker as renewalCleanupWorker };
