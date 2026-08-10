# LOCAL ONLY — Marketplace standalone compose

This repository’s root `docker-compose.yml` and `deployment/` stack are for **local/legacy** use.

## Production

Use **DevMinds platform**:

- Network: `devminds-net` (apps) + `public-proxy` (edge ↔ `devminds-internal-nginx`)
- Ops: `./scripts/dm.sh production platform deploy` from `devminds-platform`
- TLS: shared Let’s Encrypt SAN on DevMinds nginx (edge does SNI passthrough)

## Do not

- Bind host `0.0.0.0:80` / `:443` while the edge gateway is running
- Treat `marketplace-net` as the production edge plane

Standalone nginx here binds **loopback** (`127.0.0.1:9088` / `:9448`) to avoid colliding with edge.
