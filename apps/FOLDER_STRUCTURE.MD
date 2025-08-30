Here’s a scalable, “feature-first” folder structure for your Cloudflare API Worker (TypeScript + Hono/itty + Prisma/Drizzle + Zod), built to grow cleanly as Lynkby adds TikTok sync, Tip Jar, and analytics.

/apps/api-worker
├─ src/
│  ├─ app.ts                     # Worker bootstrap: create app, register middleware, mount routes
│  ├─ routes/                    # HTTP route entrypoints (thin). Map URLs -> feature handlers
│  │  ├─ index.ts                # mounts all feature routers (v1, health, webhooks)
│  │  ├─ v1/
│  │  │  ├─ index.ts             # versioned router, mounts feature subrouters
│  │  │  ├─ auth.routes.ts
│  │  │  ├─ pages.routes.ts
│  │  │  ├─ tiktok.routes.ts
│  │  │  ├─ tips.routes.ts
│  │  │  ├─ analytics.routes.ts
│  │  │  └─ webhooks.routes.ts
│  │  └─ health.routes.ts
│  │
│  ├─ features/                  # Vertical slices: keep domain logic together
│  │  ├─ auth/
│  │  │  ├─ auth.controller.ts   # orchestrates use-cases, translates to HTTP
│  │  │  ├─ auth.service.ts      # business logic; pure where possible
│  │  │  ├─ auth.repo.ts         # DB access (Prisma/Drizzle)
│  │  │  ├─ auth.schemas.ts      # Zod input/output DTOs
│  │  │  ├─ auth.types.ts
│  │  │  └─ __tests__/...
│  │  ├─ pages/
│  │  │  ├─ pages.controller.ts
│  │  │  ├─ pages.service.ts
│  │  │  ├─ pages.repo.ts
│  │  │  ├─ pages.schemas.ts
│  │  │  └─ pages.types.ts
│  │  ├─ tiktok/
│  │  │  ├─ tiktok.controller.ts
│  │  │  ├─ tiktok.service.ts    # TikTok API client orchestration & autosync pipeline
│  │  │  ├─ tiktok.client.ts     # isolated HTTP client; easy to mock
│  │  │  ├─ tiktok.schemas.ts
│  │  │  └─ tiktok.repo.ts
│  │  ├─ tips/
│  │  │  ├─ tips.controller.ts
│  │  │  ├─ tips.service.ts      # Stripe Connect flows, fees calculation
│  │  │  ├─ tips.repo.ts
│  │  │  ├─ tips.schemas.ts
│  │  │  └─ stripe.webhooks.ts   # raw webhook verifier (mounted in routes)
│  │  └─ analytics/
│  │     ├─ analytics.controller.ts
│  │     ├─ analytics.service.ts
│  │     ├─ analytics.repo.ts
│  │     └─ analytics.schemas.ts
│  │
│  ├─ core/                      # Shared, stable core (don’t import features from here)
│  │  ├─ env.ts                  # env parsing (Zod), typed Bindings (KV, R2, Queues, DOs)
│  │  ├─ db/
│  │  │  ├─ prisma.client.ts     # Worker-safe Prisma client singleton (Data Proxy/Accelerate) OR
│  │  │  └─ drizzle.client.ts    # if using Drizzle + Neon HTTP; pick one and delete the other
│  │  ├─ http.ts                 # Hono/itty factory, error mapping, response helpers
│  │  ├─ middleware/
│  │  │  ├─ auth.ts              # Bearer/JWT/session validation (reads from env)
│  │  │  ├─ rate-limit.ts        # KV/DO/Turnstile based limiter
│  │  │  ├─ cors.ts
│  │  │  └─ cache.ts             # CDN/Cache API helpers
│  │  ├─ cache/
│  │  │  ├─ kv.ts                # KV helpers
│  │  │  └─ r2.ts                # R2 helpers (avatars, thumbnails)
│  │  ├─ queue/                  # Cloudflare Queues producers/consumers
│  │  │  ├─ index.ts
│  │  │  └─ tiktok.sync.consumer.ts
│  │  ├─ scheduler/              # Cron-triggered jobs (Wrangler schedules)
│  │  │  └─ tiktok.refresh.cron.ts
│  │  ├─ util/
│  │  │  ├─ logger.ts            # structured logs (console + request id)
│  │  │  ├─ crypto.ts
│  │  │  └─ result.ts            # Result/Either helpers (optional)
│  │  └─ errors.ts               # AppError taxonomy + mappers
│  │
│  ├─ schemas/                   # Cross-feature DTOs (if truly cross-cutting)
│  │  └─ pagination.ts
│  ├─ workers/                   # Worker entry(s)
│  │  ├─ index.ts                # export default { fetch, queue, scheduled }
│  │  ├─ queue.ts                # Queue consumer handler
│  │  └─ scheduled.ts            # Cron handler
│  └─ index.ts                   # single export that wires app -> worker handlers
│
├─ tests/
│  ├─ e2e/                       # API contract tests (Miniflare/Vitest)
│  └─ fixtures/
│     ├─ seed.sql/json
│     └─ stripe.webhook.samples.json
│
├─ wrangler.toml                 # envs (dev/staging/prod), bindings (KV/R2/Queues/DO)
├─ package.json
├─ tsconfig.json                 # path aliases: @core/*, @features/*, @schemas/*
├─ eslintrc.cjs
└─ README.md

Why this works
	•	Feature-first (vertical slices): features/* holds controller/service/repo/schemas together, minimizing cross-module spaghetti as you scale.
	•	Thin routes, fat use-cases: routes only parse/validate and delegate; business logic lives in services.
	•	Clear boundaries: core/* is stable infrastructure; it never imports features/* (one-way dependency).
	•	Native Workers cadence: workers/index.ts exposes { fetch, scheduled, queue }, keeping Cloudflare handlers obvious.
	•	Versioned API: /routes/v1/* lets you ship /v2 later without breaking contracts.

⸻

Key files (short examples)

src/core/env.ts

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development","staging","production"]),
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string(),
  // Cloudflare bindings typed below:
});

export type AppEnv = z.infer<typeof EnvSchema> & Bindings;

export const parseEnv = (env: unknown) => EnvSchema.parse(env);

// Example Bindings interface you can augment:
export interface Bindings {
  DB: D1Database | undefined;          // if using D1
  KV_CACHE: KVNamespace;
  R2_ASSETS: R2Bucket;
  QUEUE_TIKTOK_SYNC: Queue;
  // ...add Durable Objects etc.
}

src/core/db/prisma.client.ts (singleton pattern safe for Workers using Data Proxy/Accelerate)

import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

let _prisma: PrismaClient | null = null;

export const prisma = () => {
  if (_prisma) return _prisma;
  _prisma = new PrismaClient().$extends(withAccelerate());
  return _prisma;
};

src/routes/v1/pages.routes.ts

import { z } from "zod";
import { Hono } from "hono";
import * as Pages from "@/features/pages/pages.controller";

const r = new Hono();

const UpsertSchema = z.object({
  displayName: z.string().min(1),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
  links: z.array(z.object({ title: z.string(), url: z.string().url() })).max(50),
});

r.get("/pages/:username", Pages.getPublicByUsername);
r.post("/pages", async (c) => {
  const body = await c.req.json();
  const parsed = UpsertSchema.parse(body);
  const result = await Pages.upsert(c, parsed);
  return c.json(result, 200);
});

export default r;

src/features/pages/pages.controller.ts

import { Context } from "hono";
import { pagesService } from "./pages.service";

export async function getPublicByUsername(c: Context) {
  const username = c.req.param("username");
  const page = await pagesService.getPublic(username);
  return page ? c.json(page) : c.notFound();
}

export async function upsert(c: Context, input: any) {
  const userId = c.get("userId"); // set by auth middleware
  return pagesService.upsert(userId, input);
}

src/features/pages/pages.service.ts

import { pagesRepo } from "./pages.repo";
export const pagesService = {
  async getPublic(username: string) {
    return pagesRepo.findByUsername(username);
  },
  async upsert(userId: string, input: any) {
    // add business rules: limits per plan, sanitize, etc.
    return pagesRepo.upsert(userId, input);
  },
};


⸻

wrangler.toml (sketch)

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