# Lynkby Deployment Guide

This guide covers deploying the Lynkby platform to Cloudflare, including the main app, web app, API, and marketing site.

## Architecture Overview

- **App** (`@lynkby/app`): Main dashboard application deployed to Cloudflare Workers at `app.lynkby.com`
- **Web** (`@lynkby/web`): Public-facing profile pages deployed to Cloudflare Workers at `*.lynkby.com/*`
- **API** (`@lynkby/api`): Edge API handling data operations and caching at `api.lynkby.com`
- **Marketing** (`@lynkby/marketing`): Marketing website deployed to Cloudflare Workers at `lynkby.com`

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Domain**: Configure `lynkby.com` in Cloudflare DNS
3. **Wrangler CLI**: Install with `npm install -g wrangler`
4. **Authentication**: Run `wrangler login` to authenticate

## Local Development Setup

### 1. Environment Variables

Each app has its own `.dev.vars` file for local development:

```bash
# apps/app/.dev.vars
NODE_ENV=development
APP_API_BASE=https://lynkby-api-dev.arifento85.workers.dev

# apps/web/.dev.vars
NODE_ENV=development
NEXT_PUBLIC_APP_API_BASE=https://lynkby-api-dev.arifento85.workers.dev

# apps/api/.dev.vars
NODE_ENV=development
APP_API_BASE=https://app.lynkby.com
REVALIDATE_SECRET=dev-secret-change-me

# apps/marketing/.dev.vars
NODE_ENV=development
NEXT_PUBLIC_APP_API_BASE=https://lynkby-api-dev.arifento85.workers.dev
```

### 2. Start Development Servers

```bash
# Start all apps in parallel
pnpm dev

# Or start individually
pnpm --filter @lynkby/app dev      # http://localhost:3001
pnpm --filter @lynkby/web dev      # http://localhost:3000
pnpm --filter @lynkby/api dev      # http://localhost:8787
pnpm --filter @lynkby/marketing dev # http://localhost:3002
```

## Deployment

### 1. Build All Apps

```bash
pnpm build
```

### 2. Deploy to Production

```bash
# Deploy all apps to production
pnpm deploy:all

# Or deploy individually
pnpm deploy:app        # Deploy main app to app.lynkby.com
pnpm deploy:web        # Deploy web app to *.lynkby.com/*
pnpm deploy:api        # Deploy API to api.lynkby.com
pnpm deploy:marketing  # Deploy marketing to lynkby.com
```

### 3. Deploy to Development

```bash
# Deploy all apps to development
pnpm deploy:all:dev

# Or deploy individually
pnpm deploy:app:dev
pnpm deploy:web:dev
pnpm deploy:api:dev
pnpm deploy:marketing:dev
```

## Route Configuration

### Production Routes

- **App**: `app.lynkby.com/*` → Cloudflare Workers (`lynkby-app.arifento85.workers.dev`)
- **Web**: `*.lynkby.com/*` → Cloudflare Workers (`lynkby-web.arifento85.workers.dev`)
- **API**: `api.lynkby.com/*` → Cloudflare Workers (`lynkby-api.arifento85.workers.dev`)
- **Marketing**: `lynkby.com/*` → Cloudflare Workers (`lynkby-marketing.arifento85.workers.dev`)

### Development Routes

- **App**: `app-dev.lynkby.com/*` → Cloudflare Workers (`lynkby-app-dev.arifento85.workers.dev`)
- **Web**: `*.lynkby.com/*` → Cloudflare Workers (`lynkby-web-dev.arifento85.workers.dev`)
- **API**: `api-dev.lynkby.com/*` → Cloudflare Workers (`lynkby-api-dev.arifento85.workers.dev`)
- **Marketing**: `marketing-dev.lynkby.com/*` → Cloudflare Workers (`lynkby-marketing-dev.arifento85.workers.dev`)

## Performance Strategy

### Cloudflare Workers Architecture

All apps now deploy as Cloudflare Workers for maximum performance:

```typescript
// Example: apps/web/src/index.ts
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Handle wildcard subdomains for user profiles
app.get("*", async (c) => {
  const hostname = c.req.url;
  const subdomain = hostname.split('.')[0];
  // Serve dynamic profile pages
});
```

### Edge Caching & Performance

- **Global Edge Network**: Deployed to 200+ locations worldwide
- **Zero Cold Starts**: Workers are always warm and ready
- **Intelligent Caching**: Built-in caching with custom cache policies
- **Subdomain Routing**: Dynamic routing for unlimited user profiles

### Caching Strategy

```typescript
// Cache HTML responses for profiles
const cache = caches.default;
c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()));

// Cache JSON responses with SWR
"Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=60"
```

## Environment Management

### Production Variables

Set in `wrangler.toml` environment sections:

```toml
[env.production.vars]
NODE_ENV = "production"
APP_API_BASE = "https://api.lynkby.com"
```

### Development Variables

Use `.dev.vars` files (gitignored):

```bash
# Example: apps/app/.dev.vars
NODE_ENV=development
APP_API_BASE=https://lynkby-api-dev.arifento85.workers.dev
```

## GitHub Actions Deployment

### Tag-Based Deployment

Deployments are triggered by Git tags:

```bash
# Deploy all apps
git tag v1.0.0
git push origin v1.0.0

# Deploy specific app
git tag app-v1.0.0
git push origin app-v1.0.0
```

### Manual Deployment

Use GitHub Actions UI to manually trigger deployments:
- Go to Actions → Deploy Workers → Run workflow
- Choose app: `all`, `app`, `api`, `web`, or `marketing`

## Troubleshooting

### Common Issues

1. **Build Failures**: Ensure all dependencies are installed with `pnpm install`
2. **Environment Variables**: Check `.dev.vars` files for local development
3. **Port Conflicts**: Each app uses different ports (3000, 3001, 3002, 8787)
4. **Worker Deployment**: Verify `src/index.ts` exists for Worker apps

### Debug Commands

```bash
# Check app status
pnpm typecheck
pnpm lint

# Clean build artifacts
pnpm clean

# Reinstall dependencies
pnpm install:all

# Test individual deployments
pnpm --filter @lynkby/app deploy:dev
pnpm --filter @lynkby/api deploy:dev
```

## Security Considerations

- **Environment Variables**: Never commit `.dev.vars` or `.env` files
- **API Keys**: Use Cloudflare's secret management for sensitive data
- **CORS**: Configure appropriate CORS policies for cross-origin requests
- **Rate Limiting**: Implement rate limiting in the API for public endpoints
- **Subdomain Validation**: Validate usernames to prevent abuse

## Monitoring & Analytics

- **Cloudflare Analytics**: Built-in analytics for Workers
- **Error Tracking**: Monitor API errors in Cloudflare dashboard
- **Performance**: Use Cloudflare's performance insights and caching analytics
- **Real-time Metrics**: Monitor Worker performance and errors in real-time

## Worker-Specific Features

### App Worker (`@lynkby/app`)
- Dashboard interface for profile management
- API proxy to main API worker
- User authentication and profile editing

### Web Worker (`@lynkby/web`)
- Wildcard subdomain routing (`*.lynkby.com`)
- Dynamic profile page generation
- Client-side data fetching from API

### API Worker (`@lynkby/api`)
- Data operations and caching
- Public read-only endpoints
- Profile revalidation and cache management

### Marketing Worker (`@lynkby/marketing`)
- Main marketing website
- Static content with dynamic elements
- Integration with other services


