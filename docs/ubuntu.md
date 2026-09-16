# Ubuntu hosting — Marketplace API (and optional full stack)

Use a VPS (Ubuntu 22.04 / 24.04) when you want a long-running Node process: Socket.IO, Redis, uploads on disk, and optional Elasticsearch.

Customer Next.js can run on the **same** machine (PM2 + nginx) or stay on Vercel with `NEXT_PUBLIC_API_BASE_URL` pointing at this API.

## 1. Bootstrap

```bash
sudo bash scripts/ubuntu-bootstrap.sh
```

Installs Node.js 20, build tools, nginx, and Redis. Run as a sudo-capable user.

## 2. App user and code

```bash
sudo mkdir -p /var/www/marketplace-api
sudo chown -R "$USER":"$USER" /var/www/marketplace-api
git clone <this-repo-url> /var/www/marketplace-api
cd /var/www/marketplace-api
cp .env.example .env
# edit .env: HOSTING_PLATFORM=local, DB_PROVIDER, DATABASE_URL, TOKEN_SECRET, CORS_ORIGIN, REDIS_URL
npm ci
export DB_PROVIDER=mysql   # or postgresql
npx prisma generate
npx prisma migrate deploy
npm run seed:all   # optional
```

## 3. Process manager (PM2)

```bash
sudo npm i -g pm2
bash scripts/ubuntu-run.sh
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME"
```

## 4. nginx + TLS

Copy [`nginx-marketplace.devminds.net.conf`](./nginx-marketplace.devminds.net.conf) into sites-available, enable it, then:

```bash
sudo certbot --nginx -d marketplace.devminds.net
```

Same-domain layout: `/` → Next `:3000`, `/backend/` → Express `:4000`.
