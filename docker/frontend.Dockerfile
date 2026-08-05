# syntax=docker/dockerfile:1.7
# Clones and builds the marketplace Next.js frontend at image-build time.

FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /opt/apps

# ── source clone ───────────────────────────────────────────────────────────
FROM base AS source
ARG FRONTEND_REPO_URL=https://github.com/noorullahazizidxb/MarketPlace-Next-JS.git
ARG FRONTEND_REPO_REF=main
RUN git clone --depth=1 --branch "$FRONTEND_REPO_REF" "$FRONTEND_REPO_URL" frontend

# ── build ─────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=source /opt/apps/frontend /srv/frontend
WORKDIR /srv/frontend

# All NEXT_PUBLIC_* vars are inlined at build-time
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_ENABLE_ELASTIC_SEARCH
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_FACEBOOK_APP_ID
ARG NEXT_PUBLIC_GOOGLE_AUTH_URL
ARG NEXT_PUBLIC_FACEBOOK_AUTH_URL
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG BLOG_ORIGIN
ARG MARKETPLACE_ORIGIN

ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NEXT_PUBLIC_ENABLE_ELASTIC_SEARCH=${NEXT_PUBLIC_ENABLE_ELASTIC_SEARCH} \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID} \
    NEXT_PUBLIC_FACEBOOK_APP_ID=${NEXT_PUBLIC_FACEBOOK_APP_ID} \
    NEXT_PUBLIC_GOOGLE_AUTH_URL=${NEXT_PUBLIC_GOOGLE_AUTH_URL} \
    NEXT_PUBLIC_FACEBOOK_AUTH_URL=${NEXT_PUBLIC_FACEBOOK_AUTH_URL} \
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY} \
    BLOG_ORIGIN=${BLOG_ORIGIN} \
    MARKETPLACE_ORIGIN=${MARKETPLACE_ORIGIN}

RUN npm install
RUN npm run build

# ── production image ───────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS app
WORKDIR /srv/frontend
ENV NODE_ENV=production

COPY --from=builder /srv/frontend/public        ./public
COPY --from=builder /srv/frontend/.next/standalone ./
COPY --from=builder /srv/frontend/.next/static   ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
