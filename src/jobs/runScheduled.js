import { config } from '../config/index.js';
import {
  runBlogExpiry,
  runContentCleanup,
  runFeedbackReminder,
  runModerationCleanup,
  runRenewalExpire,
  runRenewalReminder,
  runStatusCleanup,
} from './handlers.js';

function daysAgo(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff.toISOString();
}

const JOBS = {
  'moderation-cleanup': () => runModerationCleanup({ cutoff: daysAgo(config.retention.unapprovedDays) }),
  'renewal-reminder': () => runRenewalReminder(),
  'content-cleanup': () => runContentCleanup({
    cutoff: daysAgo(config.retention.contentCleanupDays || 30),
    types: ['story', 'blog'],
  }),
  'status-cleanup': () => runStatusCleanup(),
  'renewal-cleanup': () => runRenewalExpire(),
  'feedback-reminder': () => runFeedbackReminder(),
  'blog-expiry': () => runBlogExpiry(),
};

export function scheduledJobNames() {
  return Object.keys(JOBS);
}

export async function runScheduledJob(name) {
  const job = JOBS[name];
  if (!job) {
    const error = new Error(`Unknown scheduled job "${name}"`);
    error.status = 404;
    throw error;
  }
  return job();
}
