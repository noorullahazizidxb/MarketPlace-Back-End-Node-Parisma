import { queues, QUEUES } from '../jobs/queues.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function scheduleRecurringJobs() {
  // Schedule moderation cleanup daily
  const unapprovedCutoff = new Date();
  unapprovedCutoff.setDate(unapprovedCutoff.getDate() - config.retention.unapprovedDays);

  // moderation cleanup - scheduled at configured hour
  const modTime = config.schedules.moderationCleanupTime || '03:00';
  const [modHour, modMin] = modTime.split(':').map(s => parseInt(s, 10));
  await queues[QUEUES.MODERATION_CLEANUP].add('daily-unapproved-cleanup', { cutoff: unapprovedCutoff.toISOString() }, { repeat: { cron: `${modMin} ${modHour} * * *` } });

  // Schedule status cleanup daily
  const statusTime = config.schedules.statusCleanupTime || '04:00';
  const [statusHour, statusMin] = statusTime.split(':').map(s => parseInt(s, 10));
  await queues[QUEUES.STATUS_CLEANUP].add('daily-status-cleanup', {}, { repeat: { cron: `${statusMin} ${statusHour} * * *` } });

  // Feedback reminder - daily
  const feedbackTime = config.schedules.feedbackReminderTime || '05:00';
  const [fbHour, fbMin] = feedbackTime.split(':').map(s => parseInt(s, 10));
  await queues[QUEUES.FEEDBACK_REMINDER].add('daily-feedback-reminder', {}, { repeat: { cron: `${fbMin} ${fbHour} * * *` } });

  // Renewal cleanup - daily
  const renewalTime = config.schedules.renewalCleanupTime || '06:00';
  const [renHour, renMin] = renewalTime.split(':').map(s => parseInt(s, 10));
  await queues[QUEUES.STATUS_CLEANUP].add('daily-renewal-cleanup', {}, { repeat: { cron: `${renMin} ${renHour} * * *` } });

  logger.info('Scheduled recurring jobs');
}
