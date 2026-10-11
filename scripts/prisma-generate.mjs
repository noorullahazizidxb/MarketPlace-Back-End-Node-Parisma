/**
 * Generate the Prisma client for the active SQL engine.
 * postgresql → prisma/postgres/schema.prisma (Neon / Vercel)
 * anything else → prisma/schema.prisma (MySQL, Docker / VPS default)
 *
 * Exits 0 when the schema is not on disk yet (Docker deps image copies
 * package.json before prisma/).
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const provider = String(process.env.DB_PROVIDER || 'mysql').toLowerCase();
const postgres = provider === 'postgresql' || provider === 'postgres';
const schemaRel = postgres ? 'prisma/postgres/schema.prisma' : 'prisma/schema.prisma';

if (!existsSync(path.join(root, schemaRel))) {
  console.log(`prisma generate skipped: ${schemaRel} is not present yet`);
  process.exit(0);
}

const result = spawnSync(
  'npx',
  ['prisma', 'generate', '--schema', schemaRel],
  { cwd: root, stdio: 'inherit', shell: true, env: process.env },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
