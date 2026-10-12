# Backend env examples

Copy one file to the repo root as `.env`, then fill every `replace-me` value. Do not commit the copied `.env`.

| File | Use |
| --- | --- |
| `local.env.example` | This machine, SQLite, no Redis. Same shape as `npm run setup:defaults`. |
| `local-mysql.env.example` | This machine with MySQL and Redis. |
| `paid-vps.env.example` | A VPS (Ubuntu or Docker) with MySQL, Redis, and Socket.IO. |
| `vercel-free.env.example` | Vercel Hobby. Redis, search, and Socket.IO stay off. |
| `vercel-paid.env.example` | Vercel Pro, plus Blob uploads and a cron secret. |
| `neon.env.example` | Neon Postgres. Pair it with the Vercel or VPS file's other keys. |
| `turso.env.example` | Turso URL shape only. This API cannot connect to Turso yet. |

`DB_PROVIDER` must be `sqlite`, `mysql`, or `postgresql`. The app does not read `DATABASE_PROVIDER`.
