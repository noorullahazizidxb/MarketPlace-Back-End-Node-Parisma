# Redis usage and optimizations

This project can use a local Redis server (set `REDIS_URL` in `.env`) for:

- BullMQ queues (background workers)
- Shared rate-limiting across processes (via `rate-limit-redis` if installed)
- Redis-backed search caching for repeated queries

If Redis is unavailable, the system falls back to in-process LRU cache and in-memory rate limiting. For full production performance, run Redis and install all dependencies.
