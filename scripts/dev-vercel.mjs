#!/usr/bin/env node
/**
 * Run both apps in Vercel-like mode on this PC:
 * - API: HOSTING_PLATFORM=vercel (Redis/ES/Socket/queues off), still listens locally
 * - Next: /backend rewrite → API, Socket.IO off
 *
 * Usage: node scripts/dev-vercel.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = process.env.FRONTEND_PATH
  ? path.resolve(process.env.FRONTEND_PATH)
  : [
      path.resolve(backendRoot, '..', 'MarketPlace-Next-JS'),
    ].find((dir) => fs.existsSync(path.join(dir, 'package.json')));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}`);
  }
  return dotenv.parse(fs.readFileSync(filePath));
}

function start(label, cmd, args, cwd, extraEnv) {
  console.log(`Starting ${label}...`);
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  child.on('exit', (code) => {
    if (code) console.error(`${label} exited with code ${code}`);
  });
  return child;
}

const backendEnv = loadEnvFile(path.join(backendRoot, '.env.vercel.local'));
const frontendEnvFile = frontendRoot
  ? (fs.existsSync(path.join(frontendRoot, '.env.vercel.local'))
      ? path.join(frontendRoot, '.env.vercel.local')
      : path.join(frontendRoot, '.env.local'))
  : null;
const frontendEnv = frontendEnvFile ? loadEnvFile(frontendEnvFile) : {};

const children = [];
children.push(start('API (Vercel mode)', 'node', ['src/index.js'], backendRoot, backendEnv));

if (frontendRoot) {
  children.push(start('frontend (Vercel rewrite)', 'npm', ['run', 'dev'], frontendRoot, {
    ...frontendEnv,
    PORT: '3000',
  }));
} else {
  console.warn('Frontend repo not found. API only.');
}

const shutdown = () => {
  for (const child of children) {
    try { child.kill('SIGINT'); } catch { /* ignore */ }
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('\nVercel-like local URLs:');
console.log('  Site:        http://localhost:3000');
console.log('  API direct:  http://localhost:4000/api/health');
console.log('  API rewrite: http://localhost:3000/backend/api/health');
console.log('  Login:       admin@example.com / MarketPlace@2026\n');
