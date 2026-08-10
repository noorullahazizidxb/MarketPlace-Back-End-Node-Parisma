import dotenv from 'dotenv';
dotenv.config();

function readEnv(...keys) {
  for (const key of keys) {
    if (process.env[key] !== undefined) return process.env[key];
  }
  return undefined;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisUsername: process.env.REDIS_USERNAME || '',
  redisPassword: process.env.REDIS_PASSWORD || '',
  elastic: {
    enabled: parseBoolean(readEnv('ENABLE-ELASTIC-SEARCH', 'ENABLE_ELASTIC_SEARCH'), true),
    node: process.env.ELASTICSEARCH_NODE || 'https://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD,
    index: process.env.ELASTICSEARCH_INDEX || 'listings',
    usersIndex: process.env.ELASTICSEARCH_USERS_INDEX || 'users',
    blogsIndex: process.env.ELASTICSEARCH_BLOGS_INDEX || 'blogs',
    allowSelfSigned: parseBoolean(process.env.ELASTICSEARCH_ALLOW_SELF_SIGNED, true)
  },
  tokens: {
    secret: process.env.TOKEN_SECRET || 'dev_secret'
  },
  socialAuth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    facebookAppId: process.env.FACEBOOK_APP_ID,
    facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
  },
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    minScore: parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5'),
  },
  retention: {
    unapprovedDays: parseInt(process.env.LISTING_UNAPPROVED_DELETE_AFTER_DAYS || process.env.UNAPPROVED_RETENTION_DAYS || '2', 10),
    renewWindowDays: parseInt(process.env.LISTING_RENEWAL_WINDOW_DAYS || process.env.RENEW_WINDOW_DAYS || '14', 10),
    contentCleanupDays: parseInt(process.env.BLOG_STORY_KEEP_DAYS || process.env.CONTENT_CLEANUP_DAYS || '30', 10),
    // Status cleanup (SOLD/RENTED/DRAFT/EXPIRED listings)
    soldRentedCleanupDays: parseInt(process.env.SOLD_RENTED_CLEANUP_DAYS || '90', 10),
    draftCleanupDays: parseInt(process.env.DRAFT_CLEANUP_DAYS || '30', 10),
    // Feedback reminder (days after sold/rented before asking for feedback)
    feedbackReminderDays: parseInt(process.env.FEEDBACK_REMINDER_DAYS || '7', 10),
    // Blog expiry settings
    blogDefaultExpiryDays: parseInt(process.env.BLOG_DEFAULT_EXPIRY_DAYS || '90', 10),
    blogRenewalNotifyDays: parseInt(process.env.NOTIFY_BLOG_OWNER_TO_RENEW_DAYS || '7', 10),
  },
  // scheduled times for recurring jobs (HH:mm in 24h)
  schedules: {
    moderationCleanupTime: process.env.DAILY_LISTING_CLEANUP_TIME || process.env.MODERATION_CLEANUP_TIME || '03:00',
    renewalCleanupTime: process.env.DAILY_RENEWAL_REMINDER_TIME || process.env.RENEWAL_CLEANUP_TIME || '06:00',
    contentCleanupTime: process.env.DAILY_BLOG_STORY_CLEANUP_TIME || process.env.CONTENT_CLEANUP_TIME || '04:00',
    statusCleanupTime: process.env.DAILY_STATUS_CLEANUP_TIME || '02:00',
    renewalExpireTime: process.env.DAILY_RENEWAL_EXPIRE_TIME || '01:00',
    feedbackReminderTime: process.env.DAILY_FEEDBACK_REMINDER_TIME || '08:00',
    blogExpiryCheckTime: process.env.DAILY_BLOG_EXPIRY_CHECK_TIME || '05:00',
  }
};
