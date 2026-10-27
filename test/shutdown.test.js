import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createShutdown, registerGracefulShutdown } from '../src/lib/shutdown.js';

const silent = { info() {}, error() {} };
const tick = () => new Promise((r) => setTimeout(r, 5));

function fakeProc() {
  const proc = new EventEmitter();
  proc.exits = [];
  proc.exit = (code) => proc.exits.push(code);
  return proc;
}

test('runs cleanups once and exits 0', async () => {
  const proc = fakeProc();
  let calls = 0;
  const closed = [];
  const server = { close: (cb) => { closed.push(1); cb(); } };
  registerGracefulShutdown({ server, cleanups: [async () => { calls += 1; }], logger: silent, proc });
  proc.emit('SIGTERM', 'SIGTERM');
  proc.emit('SIGINT', 'SIGINT');
  await tick();
  assert.equal(calls, 1);
  assert.equal(closed.length, 1);
  assert.deepEqual(proc.exits, [0, 0]);
});

test('registration is idempotent per process', () => {
  const proc = fakeProc();
  const a = registerGracefulShutdown({ logger: silent, proc });
  const b = registerGracefulShutdown({ logger: silent, proc });
  assert.equal(a, b);
  assert.equal(proc.listenerCount('SIGTERM'), 1);
  a.dispose();
  assert.equal(proc.listenerCount('SIGTERM'), 0);
});

test('timeout yields exit code 1', async () => {
  // The shutdown timer is unref'd, so keep the event loop alive like a real server would.
  const keepAlive = setInterval(() => {}, 1000);
  const shutdown = createShutdown({ cleanups: [() => new Promise(() => {})], timeoutMs: 20, logger: silent });
  try {
    assert.equal(await shutdown('SIGTERM'), 1);
  } finally {
    clearInterval(keepAlive);
  }
});

test('failing cleanup still runs the others and yields 1', async () => {
  let ran = false;
  const shutdown = createShutdown({
    cleanups: [async () => { throw new Error('boom'); }, async () => { ran = true; }],
    logger: silent,
  });
  assert.equal(await shutdown('SIGINT'), 1);
  assert.equal(ran, true);
});

test('exit:false never calls process.exit and sets exitCode', async () => {
  const proc = fakeProc();
  registerGracefulShutdown({ cleanups: [async () => {}], exit: false, logger: silent, proc });
  proc.emit('SIGTERM', 'SIGTERM');
  await tick();
  assert.deepEqual(proc.exits, []);
  assert.equal(proc.exitCode, 0);
});
