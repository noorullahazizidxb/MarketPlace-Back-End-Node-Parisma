import { startQueueWorker } from '../jobs/bullmq.js';
import { runBlogExpiry } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('blog-expiry', () => runBlogExpiry());
  return worker;
}

export { worker as blogExpiryWorker };
