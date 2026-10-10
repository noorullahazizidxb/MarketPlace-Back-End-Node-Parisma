import { startQueueWorker } from '../jobs/bullmq.js';
import { runNotificationDispatch } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('notification-dispatch', (data) => runNotificationDispatch(data));
  return worker;
}

export { worker as notificationWorker };
