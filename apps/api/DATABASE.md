# Database Integration Guide

This document explains how to set up and configure the database layer for the Lynkby API Cloudflare Worker using Prisma Accelerate with Neon.

## 🏗️ Architecture Overview

The API uses a **three-layer architecture**:

1. **Routes Layer** (`/src/routes/`) - HTTP request handling
2. **Service Layer** (`/src/core/services/`) - Business logic and database operations
3. **Repository Layer** (`/src/core/repositories/`) - Data access abstraction

## 🗄️ Database Setup

### Prerequisites

- Neon account and database
- Prisma CLI installed
- Node.js 18+ and pnpm

### 1. Neon Database Setup

1. **Create Neon Database**:
   - Go to [neon.tech](https://neon.tech)
   - Create a new project
   - Note your connection strings

2. **Get Connection Strings**:
   - **Pooled Connection** (for Prisma Accelerate): `DATABASE_URL`
   - **Direct Connection** (for migrations): `DIRECT_URL`

### 2. Environment Configuration

Create `.dev.vars` for local development:

```bash
# Database Configuration (Prisma Accelerate)
DATABASE_URL=postgresql://username:password@your-neon-host:5432/lynkby_dev
DIRECT_URL=postgresql://username:password@your-neon-host:5432/lynkby_dev

# Other required variables...
JWT_SECRET=your-jwt-secret
REVALIDATE_SECRET=your-revalidate-secret
```

**Note**: For local Prisma operations (migrations, studio), you may also need a `.env` file with the same variables.

### 3. Database Schema

The current schema is located at `apps/api/prisma/schema.prisma` and includes:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  password  String?  // Hashed password
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  page      Page?
  
  @@map("users")
}

model Page {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String   @unique
  displayName String
  bio         String?
  avatarUrl   String?
  links       Link[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("pages")
}

model Link {
  id        String   @id @default(cuid())
  page      Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)
  pageId    String
  label     String
  url       String
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("links")
}
```

## 🚀 Database Operations

### Available Scripts

```bash
# From the API app directory (apps/api)
pnpm db:generate          # Generate Prisma client
pnpm db:migrate           # Run migrations
pnpm db:push              # Push schema changes (development)
pnpm db:status            # Check migration status
pnpm db:studio            # Open Prisma Studio
pnpm db:migrate:dev       # Run custom migration script

# From the root directory
pnpm db:generate          # Generate Prisma client (delegates to API app)
pnpm db:migrate           # Run migrations (delegates to API app)
pnpm db:studio            # Open Prisma Studio (delegates to API app)
pnpm db:status            # Check migration status (delegates to API app)
```

### Migration Workflow

1. **Development**:
   ```bash
   cd apps/api
   
   # Make schema changes in prisma/schema.prisma
   pnpm db:push          # Apply changes immediately
   pnpm db:generate      # Regenerate client
   ```

2. **Production**:
   ```bash
   cd apps/api
   
   # Create migration
   npx prisma migrate dev --name descriptive_name
   
   # Deploy migration
   pnpm db:migrate
   ```

## 🔧 Prisma Accelerate Configuration

### Why Prisma Accelerate?

- **Edge Compatibility**: Works with Cloudflare Workers
- **Connection Pooling**: Efficient database connections
- **Global Distribution**: Low-latency database access
- **Automatic Retries**: Built-in resilience

### Configuration

The database client is configured in `src/core/db.ts`:

```typescript
import { withAccelerate } from "@prisma/extension-accelerate";

// Create base Prisma client
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Extend with Prisma Accelerate for edge compatibility
const acceleratedPrisma = basePrisma.$extends(withAccelerate()) as unknown as PrismaClient;
prisma = acceleratedPrisma;
```

## 🛡️ Error Handling & Resilience

### Database Service Layer

The `DatabaseService` provides:

- **Automatic Retries**: Configurable retry logic for transient failures
- **Health Checks**: Database connection monitoring
- **Transaction Support**: ACID-compliant operations
- **Error Classification**: Smart retry decisions

### Error Types

```typescript
// Don't retry these errors
const NON_RETRYABLE_ERRORS = [
  "P2002", // Unique constraint violation
  "P2003", // Foreign key constraint violation
  "P2004", // Database constraint violation
  "P2005", // Value validation failure
  "P2006", // Value validation failure
  "P2007", // Data validation error
  "P2008", // Query parsing error
  "P2009", // Query validation error
  "P2010", // Raw query failure
];
```

### Retry Configuration

```typescript
export const DB_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  QUERY_TIMEOUT: 30000, // 30 seconds
  CONNECTION_POOL_SIZE: 5,
} as const;
```

## 📊 Performance & Monitoring

### Connection Pooling

- **Pool Size**: 5 connections (configurable)
- **Connection Timeout**: 30 seconds
- **Query Timeout**: 30 seconds
- **Health Check Interval**: On-demand

### Monitoring

- **Query Logging**: Development only
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Sentry integration
- **Health Status**: Real-time monitoring

## 🔒 Security

### Environment Variables

- **Never commit** `.dev.vars` or `.env` files
- **Use different** secrets for each environment
- **Rotate** database credentials regularly
- **Limit** database access to necessary IPs

### Database Access

- **Read-only** connections for analytics
- **Connection pooling** for efficiency
- **Query parameterization** (automatic with Prisma)
- **Input validation** with Zod schemas

## 🚨 Troubleshooting

### Common Issues

1. **Connection Timeout**:
   - Check `DATABASE_URL` format
   - Verify Neon database is running
   - Check firewall settings

2. **Migration Failures**:
   - Ensure `DIRECT_URL` is set
   - Check database permissions
   - Verify schema compatibility

3. **Prisma Client Issues**:
   - Run `pnpm db:generate` from `apps/api`
   - Clear `node_modules` and reinstall
   - Check Prisma version compatibility

### Debug Commands

```bash
# From the API app directory
cd apps/api

# Check database connection
pnpm db:status

# View database logs
pnpm db:studio

# Reset database (⚠️ destructive)
pnpm db:reset

# Check environment variables
cat .dev.vars
```

## 📚 Additional Resources

- [Prisma Accelerate Documentation](https://www.prisma.io/docs/accelerate)
- [Neon Documentation](https://neon.tech/docs)
- [Cloudflare Workers Database Guide](https://developers.cloudflare.com/workers/learning/how-workers-works/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

## 🔄 Migration Checklist

Before deploying:

- [ ] Database schema is up to date in `apps/api/prisma/schema.prisma`
- [ ] Prisma client is generated (`pnpm db:generate`)
- [ ] Environment variables are set in `.dev.vars`
- [ ] Database connection is tested
- [ ] Migrations are deployed (`pnpm db:migrate`)
- [ ] Health checks are passing

## 🏗️ Project Structure

```
apps/api/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── core/
│   │   ├── db.ts              # Database client configuration
│   │   ├── services/
│   │   │   └── database.service.ts  # Database service layer
│   │   └── repositories/      # Data access layer
│   └── routes/                # HTTP endpoints
├── scripts/
│   └── migrate.ts             # Migration helper script
├── .dev.vars                  # Development environment variables
└── package.json               # Database scripts and dependencies
```

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: Production Ready - Prisma moved to API app level
