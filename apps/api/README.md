# Lynkby API

Simple, clean API structure following our CODE_STYLE principles.

## Structure

```
apps/api/
├── src/
│   ├── index.ts              # Main app setup
│   ├── routes/
│   │   └── v1.ts            # V1 API routes
│   ├── core/                # Core services and utilities
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # HTTP middleware
│   │   ├── repositories/    # Data access layer
│   │   └── util/           # Utility functions
│   └── features/           # Feature modules
│       └── auth/           # Authentication feature
├── openapi.ts              # Simple OpenAPI setup
└── README.md              # This file
```

## Key Features

### 1. **Simple and Clean**
- No overcomplicated abstractions
- Direct route definitions
- Easy to understand and maintain

### 2. **Dependency Injection**
- Controllers are injected per request
- Easy to test and mock
- Clear separation of concerns

### 3. **Cloudflare Workers Optimized**
- Per-request container creation
- Environment variables handled properly
- No global state issues

## Usage

### Main App Setup
```typescript
// src/index.ts
import { createV1Router } from "./routes/v1";
import { setupOpenAPI } from "../openapi";

const app = new Hono<{ Bindings: AppEnv }>();

// Create v1 router
const v1Router = createV1Router();

// Mount routes
app.route("/v1", v1Router);

// Setup OpenAPI (optional)
if (process.env.NODE_ENV !== 'production') {
  const openapi = setupOpenAPI(app);
  app.route("/", openapi);
}
```

### Route Definition
```typescript
// src/routes/v1.ts
export function createV1Router(): Hono<{ Bindings: AppEnv }> {
  const v1Router = new Hono<{ Bindings: AppEnv }>();
  
  // Auth routes
  const authRouter = new Hono<{ Bindings: AppEnv }>();
  
  authRouter.post("/request-link", rateLimit({...}), (c) => {
    const authController = getAuthController(c.env);
    return authController.requestMagicLink(c);
  });
  
  v1Router.route("/auth", authRouter);
  return v1Router;
}
```

### OpenAPI Setup
```typescript
// openapi.ts
export function setupOpenAPI(app: Hono<{ Bindings: AppEnv }>) {
  const openapi = fromHono(app, {
    docs_url: "/",
    openapi_url: "/openapi.json",
  });
  
  // TODO: Add endpoint schemas when needed
  return openapi;
}
```

## Benefits

### 1. **Simplicity**
- Easy to understand
- No unnecessary abstractions
- Direct and straightforward

### 2. **Maintainability**
- All routes in one place
- Easy to modify and extend
- Clear structure

### 3. **Testability**
- Controllers are injected per request
- Easy to mock dependencies
- Clear interfaces

### 4. **Performance**
- Optimized for Cloudflare Workers
- No global state issues
- Per-request container creation

## Adding New Routes

1. **Add to v1.ts**:
```typescript
authRouter.get("/new-endpoint", auth, (c) => {
  const authController = getAuthController(c.env);
  return authController.newEndpoint(c);
});
```

2. **Add controller method**:
```typescript
// In auth.controller.ts
async newEndpoint(c: Context): Promise<Response> {
  // Implementation
}
```

3. **Add service method** (if needed):
```typescript
// In auth.service.ts
async newEndpointLogic(): Promise<Result> {
  // Business logic
}
```

## Environment Variables

The API uses environment variables for configuration:

- `JWT_SECRET` - JWT signing secret
- `APP_BASE` - Base URL for the application
- `NODE_ENV` - Environment (development/staging/production)
- `KV_CACHE` - Cloudflare KV namespace for caching

## Development

### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Production Deployment
```bash
# Build and deploy
pnpm build
pnpm deploy
```

This structure follows our CODE_STYLE principles of **simplicity**, **maintainability**, and **no over-engineering**!