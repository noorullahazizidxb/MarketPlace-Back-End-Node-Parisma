# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_ENABLE_ELASTIC_SEARCH
ARG BLOG_ORIGIN
ARG MARKETPLACE_ORIGIN

ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
ENV NEXT_PUBLIC_ENABLE_ELASTIC_SEARCH=${NEXT_PUBLIC_ENABLE_ELASTIC_SEARCH}
ENV BLOG_ORIGIN=${BLOG_ORIGIN}
ENV MARKETPLACE_ORIGIN=${MARKETPLACE_ORIGIN}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN mkdir -p .data

EXPOSE 3000
CMD ["npm", "run", "start"]
