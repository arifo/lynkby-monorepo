# Lynkby API Worker

A Cloudflare Workers-based API service built with Hono.js, featuring a scalable, feature-first architecture designed for TikTok-native link-in-bio platform.

## 🏗️ Architecture

This API follows a **feature-first** architecture with clear separation of concerns:

```
src/
├── app.ts                     # Worker bootstrap and middleware setup
├── routes/                    # HTTP route entrypoints (thin)
│   ├── index.ts              # Main router that mounts all features
│   ├── v1/                   # Versioned API routes
│   │   ├── index.ts          # v1 router mounting all features
│   │   ├── auth.routes.ts    # Authentication endpoints
│   │   ├── pages.routes.ts   # Profile page management
│   │   ├── tiktok.routes.ts  # TikTok integration
│   │   ├── tips.routes.ts    # Tip jar functionality
│   │   ├── analytics.routes.ts # Analytics and tracking
│   │   └── webhooks.routes.ts # External service webhooks
│   └── health.routes.ts      # Health monitoring
├── features/                  # Vertical slices (domain logic)
│   ├── auth/                 # Authentication feature
│   ├── pages/                # Profile pages feature
│   ├── tiktok/               # TikTok integration feature
│   ├── tips/                 # Tip jar feature
│   └── analytics/            # Analytics feature
├── core/                     # Shared infrastructure
│   ├── env.ts                # Environment configuration
│   ├── errors.ts             # Error handling
│   ├── middleware/           # HTTP middleware
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── rate-limit.ts     # Rate limiting
│   │   └── cache.ts          # Caching helpers
│   └── util/                 # Utility functions
│       └── logger.ts         # Structured logging
├── schemas/                  # Cross-feature DTOs
│   └── pagination.ts         # Pagination schemas
└── workers/                  # Worker entry points
    ├── index.ts              # Main worker handlers
    ├── queue.ts              # Queue consumer
    └── scheduled.ts          # Cron job handler
```

## 🚀 Features

### Core Infrastructure
- **Edge-First**: Built on Cloudflare Workers for global performance
- **Type Safety**: Full TypeScript with Zod validation
- **Error Handling**: Centralized error management with consistent responses
- **Logging**: Structured logging with request context
- **Caching**: Intelligent caching with Cloudflare Cache API and KV
- **Rate Limiting**: Configurable rate limiting per endpoint type
- **JWT Authentication**: Secure JWT-based authentication system

### API Endpoints

#### Authentication (`/v1/auth`)
- User registration and login
- JWT token management with access and refresh tokens
- Password management
- Session handling

#### Profile Pages (`/v1/pages`)
- Create, read, update, delete profile pages
- Link management
- Public profile access
- Username validation

#### TikTok Integration (`/v1/tiktok`)
- Account connection
- Content synchronization
- Video management
- Sync status tracking

#### Tip Jar (`/v1/tips`)
- Tip creation and management
- Payment processing (Stripe)
- Tip analytics
- Settings management

#### Analytics (`/v1/analytics`)
- Page view tracking
- Link click analytics
- TikTok performance metrics
- Performance insights
- Data export

#### Webhooks (`/v1/webhooks`)
- TikTok content updates
- Stripe payment events
- Generic service integration

### Background Processing
- **Queues**: Asynchronous processing for TikTok sync, analytics, emails
- **Scheduled Tasks**: Cron jobs for content refresh, data aggregation, cleanup

## 🔧 Development

### Prerequisites
- Node.js 18+
- pnpm
- Wrangler CLI
- Cloudflare account

### Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Deploy to Cloudflare
pnpm deploy
```

### Environment Variables
Create `.dev.vars` for local development:
```bash
NODE_ENV=development
APP_API_BASE=https://app-dev.lynkby.com
REVALIDATE_SECRET=dev-secret-change-me
JWT_SECRET=dev-jwt-secret-must-be-at-least-32-characters-long
JWT_EXPIRES_IN=7d
```

### Local Development
```bash
# Start with Wrangler
pnpm dev

# API will be available at http://localhost:8787
# Health check: http://localhost:8787/_health
# API info: http://localhost:8787/api/v1
```

## 🚀 Deployment

### Cloudflare Configuration
The API is configured to deploy as a Cloudflare Worker with:

- **KV Storage**: For caching and rate limiting
- **R2 Storage**: For file assets and uploads
- **Queues**: For background processing
- **Scheduled Tasks**: For cron jobs
- **Custom Domains**: `api.lynkby.com`

### Environment-Specific Deployments
- **Development**: `api-dev.lynkby.com`
- **Production**: `api.lynkby.com`

### Deployment Commands
```bash
# Deploy to development
pnpm deploy:dev

# Deploy to production
pnpm deploy:prod

# Deploy all environments
pnpm deploy:all
```

## 📊 Performance

### Caching Strategy
- **Public Content**: Long-term caching with stale-while-revalidate
- **User Content**: Private caching with shorter TTL
- **API Responses**: Intelligent caching based on content type
- **Edge Caching**: Global distribution via Cloudflare's network

### Rate Limiting
- **Public Endpoints**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Authenticated**: 1000 requests per 15 minutes
- **Webhooks**: 10 requests per minute

## 🔒 Security

### Authentication
- JWT-based authentication with secure token storage
- Access and refresh token system
- Session management with proper expiration
- Rate limiting protection

### Input Validation
- Zod schema validation for all inputs
- Type-safe request handling
- SQL injection prevention
- XSS protection

### CORS Configuration
- Restricted origins
- Secure headers
- Content type validation

## 🧪 Testing

### Testing Strategy
- **Unit Tests**: Feature-level testing with Vitest
- **Integration Tests**: API contract testing with Miniflare
- **E2E Tests**: Full workflow testing

### Test Commands
```bash
# Run unit tests
pnpm test

# Run integration tests
pnpm test:integration

# Run all tests
pnpm test:all
```

## 📚 API Documentation

### Base URL
- **Development**: `https://api-dev.lynkby.com`
- **Production**: `https://api.lynkby.com`

### API Versioning
- **Current**: `/v1`
- **Legacy**: `/api` (backward compatibility)

### Response Format
All API responses follow a consistent format:
```json
{
  "ok": true,
  "data": { ... },
  "message": "Success message"
}
```

### Error Handling
Errors follow a standardized format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... },
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

## 🔮 Roadmap

### Phase 1: Core Features ✅
- [x] Basic API structure
- [x] Authentication endpoints with JWT
- [x] Profile management
- [x] Health monitoring

### Phase 2: Advanced Features 🔄
- [ ] TikTok API integration
- [ ] Stripe payment processing
- [ ] Analytics implementation
- [ ] Background job processing

### Phase 3: Platform Enhancement 📋
- [ ] Advanced caching strategies
- [ ] Performance optimization
- [ ] Advanced analytics
- [ ] API rate limiting dashboard

## 🤝 Contributing

### Development Guidelines

#### 1. **Strict TypeScript Rules** ⚠️
- **NO `any` types**: Use proper TypeScript types everywhere
- **Function signatures**: All functions must have explicit argument and return types
- **Type declarations**: Avoid duplicate type declarations, use interfaces and types
- **Generic types**: Use generics where appropriate for reusable components
- **Union types**: Use union types for multiple possible values
- **Const assertions**: Use `as const` for literal types and magic values

#### 2. **Code Quality Standards** 📝
- **Feature-First**: Keep related code together in feature directories
- **Thin Routes**: Routes should only handle HTTP concerns
- **Service Layer**: Business logic belongs in services
- **Error Handling**: Use centralized error handling with proper types
- **Testing**: Write tests for all new features

#### 3. **Type Safety Best Practices** 🛡️
```typescript
// ✅ GOOD: Proper typing
interface UserData {
  id: string;
  email: string;
  username: string;
}

function createUser(data: UserData): Promise<UserData> {
  // Implementation
}

// ❌ BAD: Using any
function createUser(data: any): any {
  // Implementation
}
```

#### 4. **Constants and Magic Values** 🔢
```typescript
// ✅ GOOD: Use constants for magic values
const API_LIMITS = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_USERNAME_LENGTH: 30,
} as const;

// ❌ BAD: Magic numbers/strings in code
if (pageSize > 100) { ... }
if (username.length > 30) { ... }
```

#### 5. **Error Handling Types** ⚠️
```typescript
// ✅ GOOD: Proper error typing
try {
  await someOperation();
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specific error
  } else {
    // Handle unknown error
    logger.error("Unknown error occurred", { 
      error: error instanceof Error ? error : new Error(String(error))
    });
  }
}
```

#### 6. **Function Return Types** 📤
```typescript
// ✅ GOOD: Explicit return types
async function fetchUser(id: string): Promise<User | null> {
  // Implementation
}

// ❌ BAD: Implicit return types
async function fetchUser(id: string) {
  // Implementation
}
```

### Code Style
- Follow TypeScript best practices
- Use functional programming patterns
- Implement proper error handling
- Write comprehensive documentation
- Use consistent naming conventions
- **NEVER use `any` type**
- **ALWAYS type function arguments and returns**
- **Use constants for magic numbers and strings**

## 📞 Support

For questions or issues:
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check the main project README
- **Discord**: Join our development community

---

**Last Updated**: January 2025
**Version**: 0.0.1 (Development)
**Status**: Active Development - New Architecture Implemented with Strict TypeScript Rules
