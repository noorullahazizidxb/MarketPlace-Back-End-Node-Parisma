#!/usr/bin/env node
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/index.js';
import { initBlogsIndex, indexBlog } from '../src/search/elasticsearch.js';

async function main() {
  if (!config.elastic.enabled) {
    console.log('Skipping blog reindex because Elasticsearch is disabled.');
    process.exit(0);
  }

  await initBlogsIndex();
  const pageSize = 100;
  let skip = 0;
  let total = 0;

  while (true) {
    const blogs = await prisma.blog.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, fullName: true, photo: true } } }
    });

    if (!blogs.length) break;

    for (const blog of blogs) {
      await indexBlog(blog);
      total += 1;
    }

    skip += blogs.length;
    console.log(`Indexed ${total} blogs so far...`);
  }

  console.log(`Blog reindex complete. Indexed ${total} blogs.`);
}

main()
  .catch((error) => {
    console.error('Blog reindex failed', error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (error) { }
  });