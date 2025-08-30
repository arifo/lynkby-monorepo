# Lynkby Monorepo — Progress & Current State

This is the up‑to‑date snapshot of the repo so anyone can jump in fast.

**Apps**
- Dashboard: Creator SPA for profile/link management.
  - Entry: `apps/dashboard/src/index.ts`
  - Env: `apps/dashboard/env.example`
  - Wrangler: `apps/dashboard/wrangler.toml`
  - Note: Uses `WORKER_REVALIDATE_URL` to purge wildcard cache on publish.
- Web: Marketing site on Workers, serves Next static export via assets.
  - Build: Next with `output: 'export'` → `apps/web/out`
  - Entry: `apps/web/src/index.ts` (serves `[assets]`)
  - Wrangler: `apps/web/wrangler.toml`
  - Env: `apps/web/env.example`
- Worker: Wildcard Worker for `*.lynkby.com` user pages.
  - Entry: `apps/worker/src/index.ts`
  - Cache: `apps/worker/src/lib/cache.ts`
  - Rendering: `apps/worker/src/routes/page.ts`
  - Types: `apps/worker/src/types.ts`
  - Wrangler: `apps/worker/wrangler.toml`
- API Worker: Hono API at `api.lynkby.com`.
  - App: `apps/api-worker/src/app.ts`
  - Worker handlers: `apps/api-worker/src/workers/index.ts`
  - Routes: `apps/api-worker/src/routes/*` (v1 under `routes/v1/*`)
  - Health: `apps/api-worker/src/routes/health.routes.ts`
  - Wrangler template: `apps/api-worker/wrangler.template.toml`

**Packages**
- Shared: Edge-safe schemas/types.
  - `packages/shared/src/index.ts` (contains `Profile` Zod schema/type)
- Server: Server-only helpers.
  - Prisma client: `packages/server/src/db/prisma.ts`
  - Stripe client stub: `packages/server/src/stripe/client.ts`
  - Sessions: `packages/server/src/auth/sessions.ts`

**Database / Prisma**
- Schema: `packages/server/prisma/schema.prisma`
- Migrations: `packages/server/prisma/migrations`
- API Worker migration script (loads env from `.dev.vars`, forwards `--schema`):
  - `apps/api-worker/scripts/migrate.ts`
- Commands (run from repo root):
  - Generate: `pnpm --filter @lynkby/api-worker db:generate`
  - Migrate: `pnpm --filter @lynkby/api-worker db:migrate`
  - Status/Studio: same prefix
- Required env: `DATABASE_URL`, `DIRECT_URL` in `apps/api-worker/.dev.vars`

**Routing / DNS (recommended)**
- `lynkby.com`, `www.lynkby.com` → Web (Worker, assets)
- `*.lynkby.com` → Wildcard Worker (public user pages)
- `api.lynkby.com` → API Worker
- `dashboard.lynkby.com` → Dashboard (Pages/Worker)

**Health Endpoints**
- API Worker: `/_health`, `/_health/detailed`, `/_ready`, `/debug-sentry`
  - `apps/api-worker/src/routes/health.routes.ts:1`
- Worker: `/_health`
  - `apps/worker/src/index.ts:11`
- Web: `/_health`
  - `apps/web/src/index.ts:3`

**Build / Deploy**
- Root scripts (`package.json`):
  - Dev: `pnpm dev`
  - Build: `pnpm build`
  - Deploy: `deploy:dashboard`, `deploy:web`, `deploy:api-worker`, `deploy:worker`
- Web (marketing):
  - Build: `pnpm -C apps/web build` (outputs `apps/web/out`)
  - Deploy: `pnpm -C apps/web deploy:prod` (Wrangler, `[assets]`)
- Worker (wildcard): `pnpm -C apps/worker deploy:prod`
- API Worker: `pnpm -C apps/api-worker deploy:prod`
- Dashboard: `pnpm -C apps/dashboard deploy:prod`

**Configs / Docs**
- Structure doc: `apps/api-worker/docs/FOLDER_STRUCTURE.MD`
- Wrangler examples:
  - `apps/dashboard/wrangler.example.toml`
  - `apps/web/wrangler.example.toml`
  - `apps/worker/wrangler.example.toml`
- README overview: `README.md`

**Recent Changes**
- Centralized Prisma to `packages/server/prisma`; updated migration scripts.
- Strengthened types in wildcard Worker (typed cache, Hono Context, `Profile`).
- Web now serves static export via Worker `[assets]`; added fetch handler/config.
- Removed legacy `apps/marketing`; content lives in Web.
- Health routes verified; consistent across apps.

**Open Items / Next Steps**
- Add immutable cache headers for static assets in `apps/web/src/index.ts`.
- Normalize demo/API URLs in web pages to `https://api.lynkby.com` (or local).
- Update any leftover docs under `apps/api-worker/docs/*` referencing old Prisma path.
- Add per-app README quickstart sections (run/deploy/env).

