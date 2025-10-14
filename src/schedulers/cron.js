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
  // If UNAPPROVED_RETENTION_DAYS == 0, also run an immediate one-off for testing
  if (config.retention.unapprovedDays === 0) {
    await queues[QUEUES.MODERATION_CLEANUP].add('immediate-unapproved-cleanup', { cutoff: new Date().toISOString() }, { jobId: `immediate-unapproved-${Date.now()}` });
  }

  // Schedule status cleanup daily
  // Removed: status cleanup recurring job

  // Removed: feedback reminder schedule

  // Removed: renewal cleanup schedule

  // Renewal reminder - daily (uses previous renewalCleanupTime setting)
  const renewalTime = config.schedules.renewalCleanupTime || '06:00';
  const [renHour, renMin] = renewalTime.split(':').map(s => parseInt(s, 10));
  await queues[QUEUES.RENEWAL_REMINDER].add('daily-renewal-reminder', {}, { repeat: { cron: `${renMin} ${renHour} * * *` }, jobId: 'daily-renewal-reminder' });
  // If RENEW_WINDOW_DAYS == 0, trigger immediate reminder run (acts as final state quickly)
  if (config.retention.renewWindowDays === 0) {
    await queues[QUEUES.RENEWAL_REMINDER].add('immediate-renewal-reminder', {}, { jobId: `immediate-renewal-${Date.now()}` });
  }

  // Content cleanup (stories & blogs) - daily
  try {
    const contentTime = config.schedules.contentCleanupTime || '04:00';
    const [contentHour, contentMin] = contentTime.split(':').map(s => parseInt(s, 10));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (config.retention.contentCleanupDays || 30));
    await queues[QUEUES.CONTENT_CLEANUP].add('daily-content-cleanup', { cutoff: cutoff.toISOString(), types: ['story','blog'] }, { repeat: { cron: `${contentMin} ${contentHour} * * *` }, jobId: 'daily-content-cleanup' });
    if ((config.retention.contentCleanupDays || 30) === 0) {
      await queues[QUEUES.CONTENT_CLEANUP].add('immediate-content-cleanup', { cutoff: new Date().toISOString(), types: ['story','blog'] }, { jobId: `immediate-content-${Date.now()}` });
    }
  } catch (e) {}

  logger.info('Scheduled recurring jobs');
}
