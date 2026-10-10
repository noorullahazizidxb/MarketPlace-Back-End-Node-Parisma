import { startQueueWorker } from '../jobs/bullmq.js';
import { runSearchIndex } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('search-index', (data) => runSearchIndex(data));
  return worker;
}

export { worker as searchWorker };
