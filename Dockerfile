# Deploys the whole app (web UI, API routes, Slack webhook) as one
# long-running Node.js process — required because of yt-dlp (external
# binary), better-sqlite3 (native module), and the synchronous
# extract+summarize pipeline, none of which work on serverless platforms
# like Vercel or Cloudflare Workers. See README "部署" for the reasoning.
FROM node:20-slim

# - openssl: Prisma's query engine needs it at runtime
# - python3 + build-essential: fallback in case better-sqlite3 has no
#   prebuilt binary for this platform and has to compile from source
# - curl + ca-certificates: used below to fetch the yt-dlp binary
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl python3 build-essential curl ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copying the full source before `npm ci` (rather than package.json first,
# for better layer caching) is deliberate: the postinstall script runs
# `prisma generate`, which needs prisma/schema.prisma to already be present.
COPY . .

RUN npm ci
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# `prisma migrate deploy` applies pending migrations non-interactively (the
# production-safe counterpart to `migrate dev`), then `prisma db seed`
# upserts the starter categories (safe to rerun on every deploy), then the
# server starts. `next start` reads the PORT env var Railway sets on its own.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start"]
