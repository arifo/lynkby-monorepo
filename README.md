# Lynkby Platform

Ultra-fast landing pages that auto-sync your TikToks. Lowest-fee tip jar. Simple analytics.

## 🏗️ Architecture

- Dashboard (`@lynkby/dashboard`): Creator SPA to manage profiles, links, and settings. Calls the API Worker and triggers cache revalidation on publish. Deployed to Cloudflare Pages at `dashboard.lynkby.com`.
- Web (`@lynkby/web`): Marketing site for `lynkby.com`. Static export via Next.js with no server-side code.
- Worker (`@lynkby/worker`): Wildcard Cloudflare Worker that serves public user pages at `*.lynkby.com`. Renders pages, caches HTML, exposes `/_revalidate` for per-user cache purge.
- API Worker (`@lynkby/api-worker`): Hono-based API at `api.lynkby.com` that handles auth, page CRUD, username checks, and Stripe/TikTok webhooks. Provides public read-only endpoints consumed by the Worker.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Cloudflare account with Workers and Pages

### Development

```bash
# Install dependencies
pnpm install

# Start all apps in development
pnpm dev

# Or start individually
pnpm --filter @lynkby/dashboard dev   # http://localhost:3001
pnpm --filter @lynkby/web dev         # http://localhost:3000
pnpm --filter @lynkby/api-worker dev  # http://localhost:8787
pnpm --filter @lynkby/worker dev      # http://localhost:8788

```

### Environment Setup

Each app has its own `.dev.vars` file for local development. Copy the examples and configure:

```bash
# apps/dashboard/.dev.vars
DATABASE_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable
DIRECT_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable
WORKER_REVALIDATE_URL=http://localhost:8788/_revalidate
REVALIDATE_SECRET=dev-secret-change-me
NODE_ENV=development
NEXTAUTH_SECRET=dev-secret-change-me-in-production
NEXTAUTH_URL=http://localhost:3001

# apps/web/.dev.vars
NEXT_PUBLIC_APP_BASE=http://localhost:8787
NODE_ENV=development

# apps/api-worker/.dev.vars (used by Prisma scripts)
APP_BASE=https://dashboard.lynkby.com
REVALIDATE_SECRET=dev-secret-change-me
DATABASE_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable
DIRECT_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable
```

## 🚀 Deployment

### Build

```bash
pnpm build
```

### Deploy to Production

```bash
# Deploy all apps
pnpm deploy:all

# Or deploy individually
pnpm deploy:dashboard     # Deploy dashboard to dashboard.lynkby.com
pnpm deploy:web           # Deploy web (marketing) to lynkby.com
pnpm deploy:api-worker    # Deploy API to api.lynkby.com
pnpm deploy:worker        # Deploy wildcard worker to *.lynkby.com

```

### Deploy to Development

```bash
pnpm deploy:all:dev
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [Dashboard README](apps/dashboard/README.md) - Creator SPA
- [Web README](apps/web/README.md) - Marketing site
- [API Worker README](apps/api-worker/README.md) - Edge API service


## 🏛️ Project Structure

```
lynkby/
├── apps/
│   ├── dashboard/     # Creator SPA (dashboard.lynkby.com)
│   ├── web/           # Marketing site (lynkby.com)
│   ├── worker/        # Wildcard worker (*.lynkby.com)
│   └── api-worker/    # Edge API (api.lynkby.com)
├── packages/
│   ├── shared/        # Edge-safe utilities and schemas
│   └── server/        # Server-only utilities (Prisma, Stripe, sessions)
└── package.json       # Root workspace configuration
```

## 🔧 Development Commands

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Clean build artifacts
pnpm clean

# Database operations
pnpm --filter @lynkby/app prisma:migrate
pnpm --filter @lynkby/app prisma:generate
pnpm --filter @lynkby/app prisma:studio
pnpm --filter @lynkby/app prisma:seed
```

## 🌐 Domain Structure

- dashboard.lynkby.com - Creator dashboard (Pages)
- lynkby.com - Marketing site (Pages)
- api.lynkby.com - API service (API Worker)
- {username}.lynkby.com - Public user pages (Wildcard Worker)

## 🚀 Performance Features

- **Static Export**: Web app uses static generation for maximum speed
- **Edge Caching**: API implements intelligent caching with stale-while-revalidate
- **Server-Side Rendering**: Main app uses SSR for dynamic functionality
- **Optimized Images**: WebP format with lazy loading

## 🔒 Security

- Environment variables managed via `.dev.vars` (gitignored)
- CORS policies configured for cross-origin requests
- Rate limiting implemented in API
- Secure revalidation with secret-based authentication

## 📊 Monitoring

- Cloudflare Analytics for Pages and Workers
- Built-in error tracking and performance insights
- Edge caching analytics and hit rates
