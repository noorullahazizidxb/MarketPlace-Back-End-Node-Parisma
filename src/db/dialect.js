import { Prisma } from '@prisma/client';

const PROVIDERS = new Set(['mysql', 'postgresql', 'sqlite']);
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function databaseProvider() {
  const raw = String(process.env.DATABASE_PROVIDER || 'mysql').trim().toLowerCase();
  const provider = raw === 'postgres' ? 'postgresql' : raw;
  return PROVIDERS.has(provider) ? provider : 'mysql';
}

function assertIdent(name) {
  if (!IDENT.test(name)) throw new Error(`Invalid SQL identifier: ${name}`);
  return name;
}

function quoteIdent(name) {
  const ident = assertIdent(name);
  if (databaseProvider() === 'mysql') return `\`${ident}\``;
  return `"${ident}"`;
}

export function q(name) {
  return Prisma.raw(quoteIdent(name));
}

function clampInt(value, fallback, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

export function sinceDays(days) {
  const n = clampInt(days, 30, 3650);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.sql`DATE_SUB(CURDATE(), INTERVAL ${n} DAY)`;
  if (provider === 'postgresql') return Prisma.sql`(CURRENT_DATE - (${n} * INTERVAL '1 day'))`;
  return Prisma.sql`datetime('now', ${`-${n} days`})`;
}

export function sinceWeeks(weeks) {
  const n = clampInt(weeks, 12, 520);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.sql`DATE_SUB(CURDATE(), INTERVAL ${n} WEEK)`;
  if (provider === 'postgresql') return Prisma.sql`(CURRENT_DATE - (${n} * INTERVAL '1 week'))`;
  return Prisma.sql`datetime('now', ${`-${n * 7} days`})`;
}

export function sinceMonths(months) {
  const n = clampInt(months, 12, 240);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.sql`DATE_SUB(CURDATE(), INTERVAL ${n} MONTH)`;
  if (provider === 'postgresql') return Prisma.sql`(CURRENT_DATE - (${n} * INTERVAL '1 month'))`;
  return Prisma.sql`datetime('now', ${`-${n} months`})`;
}

export function sinceYears(years) {
  const n = clampInt(years, 5, 50);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.sql`DATE_SUB(CURDATE(), INTERVAL ${n} YEAR)`;
  if (provider === 'postgresql') return Prisma.sql`(CURRENT_DATE - (${n} * INTERVAL '1 year'))`;
  return Prisma.sql`datetime('now', ${`-${n} years`})`;
}

export function dayExpr(column) {
  const col = quoteIdent(column);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.raw(`DATE_FORMAT(${col}, '%Y-%m-%d')`);
  if (provider === 'postgresql') return Prisma.raw(`to_char(${col}, 'YYYY-MM-DD')`);
  return Prisma.raw(`strftime('%Y-%m-%d', ${col})`);
}

export function monthExpr(column) {
  const col = quoteIdent(column);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.raw(`DATE_FORMAT(${col}, '%Y-%m')`);
  if (provider === 'postgresql') return Prisma.raw(`to_char(${col}, 'YYYY-MM')`);
  return Prisma.raw(`strftime('%Y-%m', ${col})`);
}

export function yearWeekExpr(column) {
  const col = quoteIdent(column);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.raw(`YEARWEEK(${col}, 1)`);
  if (provider === 'postgresql') return Prisma.raw(`to_char(${col}, 'IYYYIW')`);
  return Prisma.raw(`printf('%04d%02d', CAST(strftime('%Y', ${col}, '-3 days', 'weekday 4') AS INTEGER), (CAST(strftime('%j', ${col}, '-3 days', 'weekday 4') AS INTEGER) - 1) / 7 + 1)`);
}

export function yearExpr(column) {
  const col = quoteIdent(column);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.raw(`YEAR(${col})`);
  if (provider === 'postgresql') return Prisma.raw(`EXTRACT(YEAR FROM ${col})`);
  return Prisma.raw(`CAST(strftime('%Y', ${col}) AS INTEGER)`);
}

export function hourDiffExpr(startColumn, endColumn) {
  const start = quoteIdent(startColumn);
  const end = quoteIdent(endColumn);
  const provider = databaseProvider();
  if (provider === 'mysql') return Prisma.raw(`TIMESTAMPDIFF(HOUR, ${start}, ${end})`);
  if (provider === 'postgresql') return Prisma.raw(`EXTRACT(EPOCH FROM (${end} - ${start})) / 3600`);
  return Prisma.raw(`((julianday(${end}) - julianday(${start})) * 24)`);
}

export function boolIsTrue(column) {
  const col = quoteIdent(column);
  if (databaseProvider() === 'postgresql') return Prisma.raw(`${col} = TRUE`);
  return Prisma.raw(`${col} = 1`);
}

export function channelCount(channel) {
  return Prisma.sql`SUM(CASE WHEN ${q('channel')} = ${channel} THEN 1 ELSE 0 END)`;
}
