# Lynkby Platform

Ultra-fast landing pages that auto-sync your TikToks. Lowest-fee tip jar. Simple analytics.

## 🏗️ Architecture

- **App** (`@lynkby/app`): Main dashboard application for managing profiles
- **Web** (`@lynkby/web`): Public-facing web app for user profiles
- **API** (`@lynkby/api`): Edge API for subdomain routing and caching
- **Marketing** (`@lynkby/marketing`): Marketing website for the platform

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
pnpm --filter @lynkby/app dev      # http://localhost:3001
pnpm --filter @lynkby/web dev      # http://localhost:3000
pnpm --filter @lynkby/api dev      # http://localhost:8787
pnpm --filter @lynkby/marketing dev # http://localhost:3002
```

### Environment Setup

Each app has its own `.dev.vars` file for local development. Copy the examples and configure:

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
pnpm deploy:app        # Deploy main app to app.lynkby.com
pnpm deploy:web        # Deploy web app to lynkby.com
pnpm deploy:api        # Deploy API to api.lynkby.com
pnpm deploy:marketing  # Deploy marketing to lynkby.com
```

### Deploy to Development

```bash
pnpm deploy:all:dev
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [App README](apps/app/README.md) - Main dashboard application
- [Web README](apps/web/README.md) - Public web application
- [API README](apps/api/README.md) - Edge API service
- [Marketing README](apps/marketing/README.md) - Marketing website

## 🏛️ Project Structure

```
lynkby/
├── apps/
│   ├── app/           # Main dashboard app (app.lynkby.com)
│   ├── web/           # Public web app (lynkby.com)
│   ├── api/           # Edge API (api.lynkby.com)
│   └── marketing/     # Marketing site (lynkby.com)
├── packages/
│   └── shared/        # Shared utilities and types
├── prisma/            # Database schema and migrations
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

- **app.lynkby.com** - Main dashboard application
- **lynkby.com** - Marketing website and web app
- **api.lynkby.com** - API service (handled by API)
- **lynkby-api.arifento85.workers.dev** - API service

## 🚀 Performance Features

- **Static Export**: Web and marketing apps use static generation for maximum speed
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


