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
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
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
  retention: {
    unapprovedDays: parseInt(process.env.UNAPPROVED_RETENTION_DAYS || '2', 10),
    renewWindowDays: parseInt(process.env.RENEW_WINDOW_DAYS || '14', 10),
    contentCleanupDays: parseInt(process.env.CONTENT_CLEANUP_DAYS || '30', 10),
    // Removed: SOLD_RENTED_CLEANUP_DAYS, DRAFT_CLEANUP_DAYS, LISTING_DEFAULT_EXPIRY_DAYS, FEEDBACK_REMINDER_DAYS
  }
  ,
  // scheduled times for recurring jobs (HH:mm in 24h)
  schedules: {
    moderationCleanupTime: process.env.MODERATION_CLEANUP_TIME || '03:00',
    renewalCleanupTime: process.env.RENEWAL_CLEANUP_TIME || '06:00',
    contentCleanupTime: process.env.CONTENT_CLEANUP_TIME || '04:00'
  }
};
