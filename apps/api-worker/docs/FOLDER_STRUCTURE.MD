Lynkby monorepo folder structure and conventions.

lynkby/
├─ apps/
│  ├─ web/                                # Marketing site (Cloudflare Pages → lynkby.com)
│  │  ├─ public/
│  │  │  └─ _headers
│  │  ├─ src/
│  │  │  └─ pages/index.tsx
│  │  ├─ next.config.js
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  ├─ dashboard/                          # Creator SPA (Cloudflare Pages → dashboard.lynkby.com)
│  │  ├─ public/_headers
│  │  ├─ src/
│  │  │  ├─ pages/index.tsx
│  │  │  ├─ components/
│  │  │  └─ lib/api.ts                    # Uses @lynkby/shared/api/client
│  │  ├─ next.config.js
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  ├─ worker/                             # Wildcard Worker (Cloudflare Worker → *.lynkby.com)
│  │  ├─ src/
│  │  │  ├─ index.ts                      # Hono entry → render user pages
│  │  │  ├─ routes/page.ts
│  │  │  └─ lib/cache.ts
│  │  ├─ wrangler.toml
│  │  ├─ tsconfig.json
│  │  └─ package.json
│  │
│  └─ api-worker/                         # API Worker (Cloudflare Worker → api.lynkby.com)
│     ├─ src/
│     │  ├─ index.ts                      # Hono app, mounts routes
│     │  ├─ routes/
│     │  │  ├─ auth.ts                    # /auth/start, /auth/callback, /auth/me
│     │  │  ├─ page.ts                    # /api/page/get, /api/page/upsert
│     │  │  └─ webhooks.ts                # /webhooks/stripe
│     │  └─ lib/
│     │     ├─ cors.ts
│     │     └─ revalidate.ts              # calls worker/_revalidate
│     ├─ wrangler.toml
│     ├─ tsconfig.json
│     └─ package.json                     # depends on @lynkby/shared + @lynkby/server
│
├─ packages/
│  ├─ shared/                             # Edge-safe, isomorphic utilities
│  │  ├─ src/
│  │  │  ├─ api/client.ts                 # fetchJson
│  │  │  ├─ schema/page.ts                # zod PageSchema, UpsertPageInput
│  │  │  ├─ schema/user.ts
│  │  │  ├─ utils/slug.ts
│  │  │  ├─ constants/plans.ts            # FREE/PRO tiers, fee %
│  │  │  └─ events.ts
│  │  ├─ package.json
│  │  ├─ tsconfig.build.json
│  │  └─ tsconfig.json
│  │
│  └─ server/                             # Server-only (used by api-worker & worker)
│     ├─ prisma/
│     │  ├─ schema.prisma
│     │  └─ migrations/
│     ├─ src/
│     │  ├─ db/prisma.ts                  # Prisma client (via Accelerate/Data Proxy)
│     │  ├─ stripe/client.ts              # Stripe SDK usage
│     │  └─ auth/sessions.ts              # sign/verify JWT, cookie helpers
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ README.md
│
├─ .github/workflows/deploy.yml           # Deploy Workers via Actions
├─ package.json                           # root workspace
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md

Notes
- Monorepo uses pnpm workspaces; each app/package is versioned and built independently.
- `apps/*` are deployable targets (Cloudflare Pages/Workers). `packages/*` are shared libraries.
- `packages/shared` must be edge-safe (no Node-only APIs). `packages/server` can use server SDKs.
- `apps/api-worker` depends on `@lynkby/shared` and `@lynkby/server`; `apps/worker` depends on `@lynkby/shared` and may call `api-worker` endpoints.
- Suggested TS path aliases live in `tsconfig.base.json` and are extended per package/app.

Deployment
- Cloudflare Pages: `apps/web`, `apps/dashboard`.
- Cloudflare Workers: `apps/worker` (wildcard), `apps/api-worker` (API).
- CI: `.github/workflows/deploy.yml` builds and deploys workers; Pages can deploy via CF integrations.


name = "lynkby-api"
main = "dist/workers/index.js"
compatibility_date = "2025-08-01"
workers_dev = true

[vars]
NODE_ENV = "development"

[[kv_namespaces]]
binding = "KV_CACHE"
id = "xxxx"

[[r2_buckets]]
binding = "R2_ASSETS"
bucket_name = "lynkby-assets"

[[queues.producers]]
queue = "tiktok-sync"
binding = "QUEUE_TIKTOK_SYNC"

[[queues.consumers]]
queue = "tiktok-sync"
consumer_script = "lynkby-api"   # same worker can consume

[triggers]
crons = ["*/15 * * * *"]          # tiktok refresh

[env.staging.vars]
NODE_ENV = "staging"

[env.production.vars]
NODE_ENV = "production"


⸻

tsconfig path aliases

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@features/*": ["src/features/*"]
    }
  }
}


⸻

Testing layout
	•	Unit: src/features/**/__tests__/*.test.ts with Vitest.
	•	E2E (local): Miniflare + tests/e2e/*.test.ts hitting app.fetch(...).
	•	Contract samples: tests/fixtures/stripe.webhook.samples.json.

⸻

Patterns & conventions (keep it clean)
	•	Controllers only: (a) parse input (Zod), (b) call service, (c) map errors → HTTP.
	•	Services: business rules; no HTTP types, return domain results.
	•	Repos: the only layer touching DB; return plain objects, not ORM entities where possible.
	•	Schemas: one Zod per endpoint (RequestDTO, ResponseDTO).
	•	Errors: central AppError + mapper in core/errors.ts to consistent JSON error shape.
	•	Versioning: add /routes/v2 later; never break /v1.
	•	Background work: use Queues (for TikTok sync) and scheduled (nightly cleanups).
	•	Caching: KV for hot JSON (public page payloads), Cache API + ETag on GETs.
	•	Security: auth middleware sets userId on context; Stripe webhooks use raw body verifier path that bypasses JSON parsing.

⸻

How this maps to your monorepo
	•	Keep apps/api-worker independent; expose only typed HTTP contracts to apps/dashboard and apps/web.
	•	CI: per-app GitHub Actions, each with its own wrangler publish using environment secrets.
	•	Local dev: wrangler dev --local --port 8787, dashboard hits http://localhost:8787.

This gives you a future-proof, legible structure that matches Lynkby’s roadmap (Week 1–6), while keeping routes thin, logic testable, and infra concerns centralized.
