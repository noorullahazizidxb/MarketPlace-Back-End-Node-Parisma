#!/usr/bin/env bash
# Ubuntu 22.04/24.04 packages for running the Marketplace API (and optionally Next.js).
# Usage: sudo bash scripts/ubuntu-bootstrap.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git build-essential nginx ufw

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

apt-get install -y redis-server || true

npm install -g pm2

echo
echo "Node $(node -v)  npm $(npm -v)"
echo "Next: clone the API, copy .env.example → .env, npm ci, bash scripts/prisma-migrate.sh, bash scripts/ubuntu-run.sh"
echo "Guide: docs/ubuntu.md"
