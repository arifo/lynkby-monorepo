# Lynkby App

The main application for managing user profiles and settings. Deployed to `app.lynkby.com`.

## 🚀 Features

- **Profile Management**: Create and edit public profiles
- **Link Management**: Add, reorder, and manage social media links
- **User Authentication**: Secure user management system
- **API Endpoints**: RESTful API for profile operations
- **Database Integration**: PostgreSQL with Prisma ORM

## 🏗️ Architecture

- **Framework**: Next.js 14 with TypeScript
- **Database**: PostgreSQL with Prisma
- **Authentication**: NextAuth.js
- **Deployment**: Cloudflare Pages
- **Styling**: Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Cloudflare account

### Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your local database credentials

# Start development server
pnpm dev
# App will be available at http://localhost:3001
```

### Environment Variables

Create a `.dev.vars` file for local development:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable
DIRECT_URL=postgresql://username:password@localhost:5432/lynkby_dev?sslmode=disable

# Worker Integration
WORKER_REVALIDATE_URL=https://lynkby-app.arifento85.workers.dev/_revalidate
REVALIDATE_SECRET=dev-secret-change-me

# App Configuration
NODE_ENV=development
NEXTAUTH_SECRET=dev-secret-change-me-in-production
NEXTAUTH_URL=http://localhost:3001
```

## 🗄️ Database

### Prisma Schema

The app uses Prisma with a shared schema located at `../../packages/server/prisma/schema.prisma`.

### Database Operations

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Open Prisma Studio
pnpm prisma:studio

# Seed database
pnpm prisma:seed
```

## 🔌 API Endpoints

### Profile Management

- `GET /api/page/get?username={username}` - Get user profile
- `POST /api/page/upsert` - Create or update profile
- `GET /api/username/check?username={username}` - Check username availability

### CORS Support

All API endpoints include CORS headers for cross-origin requests from the web app and worker.

## 🚀 Deployment

### Build

```bash
pnpm build
```

### Deploy to Production

```bash
pnpm deploy:prod
# Deploys to app.lynkby.com
```

### Deploy to Development

```bash
pnpm deploy:dev
# Deploys to app-dev.lynkby.com
```

## 🔄 API Integration

The app integrates with the Lynkby API for:

- **Cache Invalidation**: Triggers API cache refresh when profiles are updated
- **Public API**: Provides data to the API's public read-only endpoints
- **Edge Caching**: API caches responses for improved performance

## 🎨 UI Components

- **Profile Editor**: Form-based profile management
- **Link Manager**: Dynamic link addition/removal
- **Username Checker**: Real-time username availability validation
- **Preview Links**: Direct links to public profile views

## 🔒 Security

- **Input Validation**: Zod schema validation for all inputs
- **CORS Headers**: Properly configured for cross-origin requests
- **Environment Variables**: Secure management via `.dev.vars`
- **Database Transactions**: Atomic operations for data consistency

## 📱 Responsive Design

- Mobile-first approach
- Optimized for all screen sizes
- Touch-friendly interface

## 🧪 Testing

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

## 📊 Performance

- **Server-Side Rendering**: Full Next.js functionality
- **API Routes**: Dynamic backend functionality
- **Database Optimization**: Efficient Prisma queries
- **Caching Strategy**: Integration with worker edge caching

## 🔗 Related Services

- **Web App**: Public-facing profile pages
- **API**: Edge caching and subdomain routing
- **Marketing**: Platform marketing website
- **Shared Package**: Common types and utilities

## 📚 Documentation

- [Lynkby Platform Overview](../../README.md)
- [Deployment Guide](../../DEPLOYMENT.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
