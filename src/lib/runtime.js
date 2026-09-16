import 'dotenv/config';

function envFlag(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isTrue(value) {
  return ['1', 'true', 'yes', 'on'].includes(envFlag(value));
}

function isFalse(value) {
  return ['0', 'false', 'no', 'off'].includes(envFlag(value));
}

function firstEnv(...keys) {
  for (const key of keys) {
    if (process.env[key] !== undefined && process.env[key] !== '') return process.env[key];
  }
  return undefined;
}

export const hostingPlatform = envFlag(process.env.HOSTING_PLATFORM) || 'local';
export const isVercelRuntime = isTrue(process.env.VERCEL);
export const isVercel = hostingPlatform === 'vercel' || isVercelRuntime;

/** Redis is on locally unless REDIS_ENABLED=false. Forced off on Vercel. */
export const redisEnabled = !isVercel && !isFalse(process.env.REDIS_ENABLED);

function searchExplicitlyEnabled() {
  const flag = firstEnv('SEARCH_ENABLED', 'ENABLE_ELASTIC_SEARCH', 'ENABLE-ELASTIC-SEARCH');
  if (flag === undefined) return false;
  return !isFalse(flag);
}

/** Elasticsearch is optional: needs an explicit enable flag and a URL. Forced off on Vercel. */
export const searchEnabled =
  !isVercel &&
  searchExplicitlyEnabled() &&
  Boolean(firstEnv('ELASTICSEARCH_URL', 'ELASTICSEARCH_NODE'));

/** Socket.IO is on locally unless SOCKET_IO_ENABLED=false. Forced off on Vercel. */
export const socketEnabled = !isVercel && !isFalse(process.env.SOCKET_IO_ENABLED);

/** BullMQ needs Redis. Forced off on Vercel. */
export const queueEnabled = redisEnabled;

export const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export function corsOrigins() {
  const raw = String(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*').trim();
  if (!raw || raw === '*') return true;
  const list = raw.split(',').map((origin) => origin.trim()).filter(Boolean);
  return list.length ? list : true;
}

export function runtimeSummary() {
  return {
    hostingPlatform: isVercel ? 'vercel' : hostingPlatform,
    dbProvider: process.env.DB_PROVIDER || 'mysql',
    redisEnabled,
    searchEnabled,
    socketEnabled,
    queueEnabled,
    blobEnabled,
  };
}
