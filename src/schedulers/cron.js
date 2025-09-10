import { queues, QUEUES } from '../jobs/queues.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function scheduleRecurringJobs() {
  // Schedule moderation cleanup daily
  const unapprovedCutoff = new Date();
  unapprovedCutoff.setDate(unapprovedCutoff.getDate() - config.retention.unapprovedDays);

  await queues[QUEUES.MODERATION_CLEANUP].add('daily-unapproved-cleanup', { cutoff: unapprovedCutoff.toISOString() }, { repeat: { cron: '0 3 * * *' } });

  // Schedule status cleanup daily
  await queues[QUEUES.STATUS_CLEANUP].add('daily-status-cleanup', {}, { repeat: { cron: '0 4 * * *' } });

  // Feedback reminder - daily
  await queues[QUEUES.FEEDBACK_REMINDER].add('daily-feedback-reminder', {}, { repeat: { cron: '0 5 * * *' } });

  // Renewal cleanup - daily
  await queues[QUEUES.STATUS_CLEANUP].add('daily-renewal-cleanup', {}, { repeat: { cron: '0 6 * * *' } });

  logger.info('Scheduled recurring jobs');
}
