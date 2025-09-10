import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  elastic: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
    index: process.env.ELASTICSEARCH_INDEX || 'listings'
  },
  platformContact: {
    whatsapp: process.env.PLATFORM_CONTACT_WHATSAPP,
    email: process.env.PLATFORM_CONTACT_EMAIL,
    phone: process.env.PLATFORM_CONTACT_PHONE
  },
  tokens: {
    secret: process.env.TOKEN_SECRET || 'dev_secret'
  },
  retention: {
    unapprovedDays: parseInt(process.env.UNAPPROVED_RETENTION_DAYS || '2', 10),
    soldRentedCleanupDays: parseInt(process.env.SOLD_RENTED_CLEANUP_DAYS || '14', 10),
    draftCleanupDays: parseInt(process.env.DRAFT_CLEANUP_DAYS || '14', 10),
    listingDefaultExpiryDays: parseInt(process.env.LISTING_DEFAULT_EXPIRY_DAYS || '30', 10),
    renewWindowDays: parseInt(process.env.RENEW_WINDOW_DAYS || '14', 10),
    feedbackReminderDays: parseInt(process.env.FEEDBACK_REMINDER_DAYS || '7', 10)
  }
};
