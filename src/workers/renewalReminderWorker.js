import { startQueueWorker } from '../jobs/bullmq.js';
import { runRenewalReminder } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('renewal-reminder', () => runRenewalReminder());
  return worker;
}

export { worker as renewalReminderWorker };
