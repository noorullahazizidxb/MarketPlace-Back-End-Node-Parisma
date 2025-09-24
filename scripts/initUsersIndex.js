#!/usr/bin/env node
import { initUsersIndex, indexUser } from '../src/search/elasticsearch.js';
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/index.js';

async function main() {
  const argv = process.argv.slice(2);
  const indexAll = argv.includes('--index-all') || argv.includes('-a');
  const batchArg = argv.find(a => a.startsWith('--batch='));
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : 100;

  try {
    console.log(`Initializing users index "${config.elastic.usersIndex}"...`);
    await initUsersIndex();
    console.log('Index initialization complete.');

    if (indexAll) {
      console.log(`Indexing all existing users in batches of ${batchSize}...`);
      let skip = 0;
      let totalIndexed = 0;
      while (true) {
        const users = await prisma.user.findMany({ skip, take: batchSize, orderBy: { id: 'asc' }, select: { id: true, email: true, fullName: true, firstName: true, lastName: true, phone: true, createdAt: true } });
        if (!users.length) break;
        for (const u of users) {
          try {
            await indexUser(u);
            totalIndexed++;
          } catch (e) {
            console.warn('Failed to index user', u.id, e.message || e);
          }
        }
        skip += users.length;
        console.log(`Indexed ${totalIndexed} users so far...`);
      }
      console.log(`Finished indexing users. Total indexed: ${totalIndexed}`);
    } else {
      console.log('Skipping indexing existing users. To index all users pass --index-all or -a');
    }
  } catch (e) {
    console.error('Initialization failed', e);
    process.exitCode = 1;
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
  }
}

main();
