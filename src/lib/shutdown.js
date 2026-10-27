/**
 * Graceful shutdown for Node.js processes (standalone servers and Vercel Functions).
 *
 * - Registers SIGTERM/SIGINT handlers once per process (guarded across module re-evaluation).
 * - On the first signal: stops accepting new connections (server.close), runs cleanups once,
 *   bounded by `timeoutMs`; repeated signals reuse the same in-flight shutdown.
 * - `exit: true` (we own the process, e.g. `npm start`) exits with 0 on success, 1 on failure/timeout.
 *   `exit: false` (serverless) never hard-exits; the platform terminates the instance.
 */
const REGISTRY_KEY = Symbol.for('app.gracefulShutdown.registered');
const DEFAULT_SIGNALS = ['SIGTERM', 'SIGINT'];

function closeServer(server) {
  if (!server) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((err) => (err && err.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(err) : resolve()));
    // Let keep-alive sockets without an active request go away immediately.
    server.closeIdleConnections?.();
  });
}

async function runCleanups(cleanups, logger) {
  let failed = false;
  for (const cleanup of cleanups) {
    try {
      await cleanup();
    } catch (err) {
      failed = true;
      logger.error?.({ err }, 'graceful shutdown: cleanup failed');
    }
  }
  return !failed;
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Pure shutdown routine (no signal wiring) - returns the exit code it would use.
 */
export function createShutdown({ server, cleanups = [], timeoutMs = 10_000, logger = console } = {}) {
  let pending;
  return function shutdown(signal = 'manual') {
    if (pending) {
      logger.info?.({ signal }, 'graceful shutdown already in progress');
      return pending;
    }
    logger.info?.({ signal, timeoutMs }, 'graceful shutdown started');
    const work = (async () => {
      let ok = true;
      try {
        await closeServer(server);
      } catch (err) {
        ok = false;
        logger.error?.({ err }, 'graceful shutdown: server close failed');
      }
      return (await runCleanups(cleanups, logger)) && ok;
    })();
    pending = withTimeout(work, timeoutMs).then((result) => {
      if (result === 'timeout') {
        logger.error?.({ signal, timeoutMs }, 'graceful shutdown timed out');
        return 1;
      }
      logger.info?.({ signal, ok: result }, 'graceful shutdown complete');
      return result ? 0 : 1;
    });
    return pending;
  };
}

/**
 * Wire `createShutdown` to process signals. Safe to call multiple times: only the first
 * registration per process is active; later calls return the existing handle.
 */
export function registerGracefulShutdown({
  server,
  cleanups = [],
  timeoutMs = 10_000,
  logger = console,
  exit = true,
  signals = DEFAULT_SIGNALS,
  proc = process,
} = {}) {
  if (proc[REGISTRY_KEY]) return proc[REGISTRY_KEY];

  const shutdown = createShutdown({ server, cleanups, timeoutMs, logger });
  const onSignal = (signal) => {
    shutdown(signal).then((code) => {
      if (exit) proc.exit(code);
      else proc.exitCode = code;
    });
  };
  signals.forEach((signal) => proc.on(signal, onSignal));

  const handle = {
    shutdown,
    dispose() {
      signals.forEach((signal) => proc.off(signal, onSignal));
      delete proc[REGISTRY_KEY];
    },
  };
  proc[REGISTRY_KEY] = handle;
  return handle;
}
