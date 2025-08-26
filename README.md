# Lynkby Monorepo

## Apps
- **apps/web** — Next.js (marketing + /u/[username] preview)
- **apps/dashboard** — Next.js (app.lynkby.com — signup/manage)
- **apps/worker** — Cloudflare Worker (serves username.lynkby.com)

## Packages
- **packages/shared** — shared types, schemas, mock data (zod)

## Database
- **prisma/** — Prisma schema & migrations (Neon Postgres + Prisma)

## Quickstart
```bash
pnpm i
pnpm dev:web        # http://localhost:3000
pnpm dev:dashboard  # http://localhost:3001
pnpm dev:worker     # http://localhost:8787
```
