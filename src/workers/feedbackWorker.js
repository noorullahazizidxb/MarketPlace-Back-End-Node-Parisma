import { startQueueWorker } from '../jobs/bullmq.js';
import { runFeedbackReminder } from '../jobs/handlers.js';

let worker = null;

export function start() {
  if (worker) return worker;
  worker = startQueueWorker('feedback-reminder', () => runFeedbackReminder());
  return worker;
}

export { worker as feedbackWorker };
