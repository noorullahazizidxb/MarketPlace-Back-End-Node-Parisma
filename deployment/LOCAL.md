# LOCAL / LEGACY — combined Marketplace + Jobs deployment

Prefer **DevMinds platform** for production (`devminds-net` + edge `public-proxy`).

This `deployment/` compose is for local/legacy side-by-side Marketplace+Jobs without the edge gateway.
It must not bind host `0.0.0.0:80` / `:443` while edge-gateway is running.
