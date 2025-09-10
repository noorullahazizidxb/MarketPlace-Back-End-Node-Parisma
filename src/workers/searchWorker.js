import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Worker, QueueEvents } = require('bullmq');
import { getES } from '../search/elasticsearch.js';
import { config } from '../config/index.js';
import IORedis from 'ioredis';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });
const indexName = config.elastic.index;

export const searchWorker = new Worker('search-index', async (job) => {
  const { listingId, force } = job.data;
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { images: true, category: true, user: true, representatives: { include: { representative: true } } } });
  if (!listing) return null;
  if (listing.status !== 'APPROVED' && !force) {
    logger.debug({ listingId }, 'Skipping indexing of non-approved listing');
    return null;
  }

  const client = getES();
  const payload = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category?.slug ?? null,
    listingType: listing.listingType,
    status: listing.status,
    price: Number(listing.price),
    currency: listing.currency,
    location: listing.location,
    address: listing.address,
    userId: listing.userId,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt
  };

  await client.index({ index: indexName, id: listing.id, document: payload });
  await client.indices.refresh({ index: indexName });
  logger.info({ listingId }, 'Indexed listing into Elasticsearch');
}, { connection });

new QueueEvents('search-index', { connection }).on('failed', (e) => logger.error({ e }, 'Search worker job failed'));
