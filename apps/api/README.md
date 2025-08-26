# Lynkby API

The edge API service for profile serving and caching. Deployed to `api.lynkby.com` via `lynkby-api.arifento85.workers.dev`.

## 🚀 Features

- **Profile Serving**: Serve user profiles at `api.lynkby.com`
- **Edge Caching**: Intelligent caching with stale-while-revalidate
- **Public API**: Read-only JSON endpoints for profile data
- **Cache Invalidation**: Secure revalidation endpoints
- **Subdomain Routing**: Handle API subdomain requests

## 🏗️ Architecture

- **Framework**: Hono.js with TypeScript
- **Runtime**: Cloudflare Workers
- **Deployment**: Cloudflare Workers
- **Caching**: Cloudflare Cache API with intelligent invalidation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- Wrangler CLI

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
# API will be available at http://localhost:8787
```

### Environment Variables

Create a `.dev.vars` file for local development:

```bash
# App API Base URL
APP_API_BASE=https://app.lynkby.com

# Revalidation Secret
REVALIDATE_SECRET=dev-secret-change-me
```

## 🔌 API Endpoints

### Public Profile Data

- `GET /api/public/page?username={username}` - Get user profile data
- **Response**: JSON with profile information
- **Caching**: 30s browser, 5min edge, 1min stale-while-revalidate

### Cache Management

- `GET /_revalidate?username={username}&secret={secret}` - Invalidate cache
- **Usage**: Called by app when profiles are updated
- **Security**: Requires valid REVALIDATE_SECRET

### Health Check

- `GET /_health` - Service health status
- **Response**: `{ ok: true, ts: "ISO_TIMESTAMP" }`

## 🚀 Deployment

### Build

```bash
pnpm build
```

### Deploy to Production

```bash
pnpm deploy:prod
# Deploys to api.lynkby.com via lynkby-api.arifento85.workers.dev
```

### Deploy to Development

```bash
pnpm deploy:dev
# Deploys to development environment
```

## 🔄 App Integration

The API integrates with the Lynkby app for:

- **Data Source**: Fetches profile data from app API endpoints
- **Cache Invalidation**: Receives revalidation requests from app
- **Public Access**: Provides read-only access to profile data

## 🎯 Caching Strategy

### HTML Responses

- **Cache Duration**: 30 seconds browser, 5 minutes edge
- **Stale While Revalidate**: 1 minute for improved performance
- **Cache Key**: Full URL including hostname for unique per-user caching

### JSON Responses

- **Cache Duration**: 30 seconds browser, 5 minutes edge
- **Stale While Revalidate**: 1 minute for API responses
- **Headers**: Proper cache control and CORS headers

## 🔒 Security

- **Input Validation**: Username validation and reserved name checking
- **Secret-Based Auth**: Revalidation requires valid secret
- **CORS Headers**: Properly configured for cross-origin requests
- **Rate Limiting**: Ready for future rate limiting implementation

## 📱 Response Headers

### Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: accelerometer=(), geolocation=(), microphone=()`

### Cache Headers

- `Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=60`
- `X-Cache: HIT/MISS` for cache status indication

## 🧪 Testing

```bash
# Type checking
pnpm typecheck

# Build verification
pnpm build
```

## 📊 Performance

- **Edge Computing**: Runs at Cloudflare's edge network
- **Intelligent Caching**: Reduces load on app servers
- **Stale While Revalidate**: Improves perceived performance
- **Cache Invalidation**: Ensures data freshness

## 🔗 Related Services

- **App**: Main dashboard application (data source)
- **Web App**: Public-facing profile pages (API consumer)
- **Marketing**: Marketing website (API consumer)
- **Shared Package**: Common types and utilities

## 📚 Documentation

- [Lynkby Platform Overview](../../README.md)
- [Deployment Guide](../../DEPLOYMENT.md)
- [Hono.js Documentation](https://hono.dev)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers)
