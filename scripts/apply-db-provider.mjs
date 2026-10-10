/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

const ALLOWED = new Set(['mysql', 'postgresql', 'sqlite']);

export function normalizeDatabaseProvider(raw) {
  const value = String(raw ?? 'mysql').trim().toLowerCase();
  if (value === 'postgres') return 'postgresql';
  if (!ALLOWED.has(value)) {
    throw new Error(`Unsupported DATABASE_PROVIDER "${raw}". Use mysql, postgresql, or sqlite.`);
  }
  return value;
}

export function renderDatasourceBlock(provider, { directUrl = false } = {}) {
  const direct = provider === 'postgresql' && directUrl
    ? '\n  directUrl = env("DATABASE_DIRECT_URL")'
    : '';
  return `datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")${direct}
}`;
}

// SQLite's connector rejects @db.Text and @db.Decimal. MySQL and PostgreSQL keep them.
const SERVER_NATIVE_FIELDS = [
  { bare: '  description       String', full: '  description       String                  @db.Text' },
  { bare: '  price             Decimal', full: '  price             Decimal                 @db.Decimal(12, 2)' },
  { bare: '  description String', full: '  description String       @db.Text' },
  { bare: '  content   String', full: '  content   String        @db.Text' },
  { bare: '  body      String', full: '  body      String   @db.Text' },
  { bare: '  message   String', full: '  message   String         @db.Text' },
];

function stripSqliteNativeTypes(schema) {
  return schema
    .replace(/[ \t]+@db\.Text/g, '')
    .replace(/[ \t]+@db\.Decimal\(\d+,\s*\d+\)/g, '');
}

function ensureServerNativeTypes(schema) {
  let next = schema;
  for (const field of SERVER_NATIVE_FIELDS) {
    const pattern = new RegExp(`^${field.bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    next = next.replace(pattern, field.full);
  }
  return next;
}

export function applyDatabaseProvider(schema, provider, options) {
  const block = renderDatasourceBlock(provider, options);
  const datasourceRe = /datasource\s+db\s+\{[\s\S]*?\n\}/;
  if (!datasourceRe.test(schema)) {
    throw new Error('prisma/schema.prisma is missing a datasource db block');
  }
  let next = schema.replace(datasourceRe, block);
  next = provider === 'sqlite' ? stripSqliteNativeTypes(next) : ensureServerNativeTypes(next);
  return next;
}

function main() {
  const provider = normalizeDatabaseProvider(process.env.DATABASE_PROVIDER);
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const next = applyDatabaseProvider(schema, provider, {
    directUrl: Boolean(process.env.DATABASE_DIRECT_URL),
  });
  if (next !== schema) fs.writeFileSync(schemaPath, next);
  console.log(`Prisma datasource provider set to ${provider}`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}
