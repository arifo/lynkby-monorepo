# Lynkby Deployment Guide

This guide covers deploying the Lynkby platform to Cloudflare, including the main app, web app, API, and marketing site.

## Architecture Overview

- **App** (`@lynkby/app`): Main dashboard application deployed to Cloudflare Pages at `app.lynkby.com`
- **Web** (`@lynkby/web`): Public-facing web app deployed to Cloudflare Pages at `lynkby.com`
- **API** (`@lynkby/api`): Edge API handling subdomain routing and caching at `api.lynkby.com`
- **Marketing** (`@lynkby/marketing`): Marketing website deployed to Cloudflare Pages at `lynkby.com`

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
DATABASE_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable
API_REVALIDATE_URL=https://lynkby-api.arifento85.workers.dev/_revalidate
REVALIDATE_SECRET=dev-secret-change-me
NODE_ENV=development
NEXTAUTH_SECRET=dev-secret-change-me-in-production
NEXTAUTH_URL=http://localhost:3001
DIRECT_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable

# apps/web/.dev.vars
NEXT_PUBLIC_APP_API_BASE=https://lynkby-api.arifento85.workers.dev
NODE_ENV=development

# apps/api/.dev.vars
APP_API_BASE=https://app.lynkby.com
REVALIDATE_SECRET=dev-secret-change-me

# apps/marketing/.dev.vars
NEXT_PUBLIC_APP_API_BASE=https://lynkby-api.arifento85.workers.dev
NODE_ENV=development
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
pnpm deploy:web        # Deploy web app to lynkby.com
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

- **App**: `app.lynkby.com/*` → Cloudflare Pages
- **Web**: `lynkby.com/*` → Cloudflare Pages  
- **API**: `api.lynkby.com/*` → Cloudflare Workers
- **Marketing**: `lynkby.com/*` → Cloudflare Pages

### Development Routes

- **App**: `app-dev.lynkby.com/*` → Cloudflare Pages
- **Web**: `web-dev.lynkby.com/*` → Cloudflare Pages
- **API**: `api.lynkby.com/*` → Cloudflare Workers
- **Marketing**: `marketing-dev.lynkby.com/*` → Cloudflare Pages

## Performance Strategy

### Static Export (Web & Marketing)

The web and marketing apps use `output: 'export'` for maximum speed:

```javascript
// next.config.mjs
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
};
```

### Server-Side Rendering (App)

The main app uses SSR for dynamic API routes:

```javascript
// next.config.mjs
const nextConfig = {
  reactStrictMode: true
};
```

### Edge Caching (API)

The API implements intelligent caching:

```typescript
// Cache HTML responses
const cache = caches.default;
c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()));

// Cache JSON responses
"Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=60"
```

## Environment Management

### Production Variables

Set in `wrangler.toml`:

```toml
[vars]
NODE_ENV = "production"
```

### Development Variables

Use `.dev.vars` files (gitignored):

```bash
# Example: apps/app/.dev.vars
DATABASE_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable
```

## Troubleshooting

### Common Issues

1. **Build Failures**: Ensure all dependencies are installed with `pnpm install`
2. **Environment Variables**: Check `.dev.vars` files for local development
3. **Port Conflicts**: Each app uses different ports (3000, 3001, 3002, 8787)
4. **Database Connection**: Verify PostgreSQL is running and accessible

### Debug Commands

```bash
# Check app status
pnpm typecheck
pnpm lint

# Clean build artifacts
pnpm clean

# Reinstall dependencies
pnpm install:all
```

## Security Considerations

- **Environment Variables**: Never commit `.dev.vars` or `.env` files
- **API Keys**: Use Cloudflare's secret management for sensitive data
- **CORS**: Configure appropriate CORS policies for cross-origin requests
- **Rate Limiting**: Implement rate limiting in the API for public endpoints

## Monitoring & Analytics

- **Cloudflare Analytics**: Built-in analytics for Pages and Workers
- **Error Tracking**: Monitor API errors in Cloudflare dashboard
- **Performance**: Use Cloudflare's performance insights and caching analytics


