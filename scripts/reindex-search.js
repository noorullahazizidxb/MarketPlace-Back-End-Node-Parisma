#!/usr/bin/env node
import { prisma } from '../src/config/prisma.js';
import { getES } from '../src/search/elasticsearch.js';
import { config } from '../src/config/index.js';

async function transform(listing) {
  return {
    id: String(listing.id),
    title: listing.title,
    description: listing.description,
    category: listing.category,
    listingType: listing.listingType,
    status: listing.status,
    price: listing.price,
    currency: listing.currency,
    location: listing.location,
    address: listing.address,
    userId: String(listing.userId),
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt
  };
}

async function reindex() {
  const client = getES();
  const index = config.elastic.index;
  const pageSize = 500;
  console.log('Starting reindex to', index);
  let page = 0;
  while (true) {
    const listings = await prisma.listing.findMany({ skip: page * pageSize, take: pageSize });
    if (!listings || listings.length === 0) break;
    const body = [];
    for (const l of listings) {
      body.push({ index: { _index: index, _id: String(l.id) } });
      body.push(await transform(l));
    }
    const resp = await client.bulk({ refresh: true, body });
    if (resp.errors) {
      console.error('Bulk indexing errors:', resp.items.filter(i => i.index && i.index.error));
      process.exit(1);
    }
    console.log(`Indexed ${listings.length} listings (page ${page + 1})`);
    page += 1;
  }
  console.log('Reindex complete');
  process.exit(0);
}

reindex().catch(e => {
  console.error('Reindex failed', e);
  process.exit(2);
});
