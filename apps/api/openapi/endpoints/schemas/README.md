# OpenAPI Schema Definitions

This directory contains **OpenAPI schema definitions only**. These files are **NOT used for actual route handling** - they only provide schemas for API documentation.

## Structure

```
openapi/endpoints/schemas/
├── healthCheck.ts              # System health check schema
├── v1Info.ts                   # V1 API info schema
└── v1/
    └── auth/                   # Auth endpoint schemas
        ├── authRequestMagicLink.ts
        ├── authConsumeMagicLink.ts
        ├── authSetupUsername.ts
        ├── authGetCurrentUser.ts
        ├── authLogout.ts
        └── authCheckUsername.ts
```

## Purpose

These files serve **one purpose only**: **OpenAPI documentation generation**.

### ✅ What they do:
- Define request/response schemas
- Provide API documentation
- Generate OpenAPI spec files
- Enable interactive API documentation

### ❌ What they DON'T do:
- Handle actual HTTP requests
- Contain business logic
- Process user data
- Return real responses

## How It Works

### 1. **OpenAPI Registration**
```typescript
// openapi/endpoints/auth.endpoints.ts
export function registerAuthEndpoints(openapi: any): void {
  openapi.post("/v1/auth/request-link", AuthRequestMagicLink);
  openapi.get("/v1/auth/verify", AuthConsumeMagicLink);
  // ... other endpoints
}
```

### 2. **Schema Definition**
```typescript
// openapi/endpoints/schemas/v1/auth/authRequestMagicLink.ts
export class AuthRequestMagicLink extends OpenAPIRoute {
  schema = {
    tags: ["Authentication"],
    summary: "Request magic link for authentication",
    request: {
      body: {
        content: {
          "application/json": {
            schema: RequestMagicLinkSchema,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Magic link sent successfully",
        // ... response schema
      },
    },
  };

  async handle() {
    // This is only used for OpenAPI schema generation
    // Actual route handling is done in routes/v1.ts
    return new Response("This endpoint is only used for OpenAPI documentation", { status: 501 });
  }
}
```

### 3. **Actual Route Handling**
```typescript
// routes/v1.ts
export function createV1Router(authController: any): Hono<{ Bindings: AppEnv }> {
  const authRouter = new Hono<{ Bindings: AppEnv }>();
  
  // This is where actual requests are handled
  authRouter.post(
    "/request-link",
    rateLimit({...}),
    (c) => authController.requestMagicLink(c)  // Real handler
  );
  
  return v1Router;
}
```

## Key Points

### 1. **Separation of Concerns**
- **`endpoints/`** = OpenAPI schemas only
- **`routes/`** = Actual route handling
- **`features/`** = Business logic

### 2. **No Duplication**
- Each endpoint has **one schema file** (for documentation)
- Each route has **one handler** (for actual processing)
- No duplicate logic between the two

### 3. **Clear Purpose**
- Schema files are **documentation-only**
- Route files are **functionality-only**
- Easy to understand what each file does

## Adding New Endpoints

### 1. **Create Schema File**
```typescript
// openapi/endpoints/schemas/v1/auth/authNewEndpoint.ts
export class AuthNewEndpoint extends OpenAPIRoute {
  schema = {
    // Define your OpenAPI schema here
  };

  async handle() {
    return new Response("This endpoint is only used for OpenAPI documentation", { status: 501 });
  }
}
```

### 2. **Register in OpenAPI**
```typescript
// openapi/endpoints/auth.endpoints.ts
export function registerAuthEndpoints(openapi: any): void {
  // ... existing endpoints
  openapi.post("/v1/auth/new-endpoint", AuthNewEndpoint);
}
```

### 3. **Add Route Handler**
```typescript
// routes/v1.ts
export function createV1Router(authController: any): Hono<{ Bindings: AppEnv }> {
  const authRouter = new Hono<{ Bindings: AppEnv }>();
  
  // ... existing routes
  authRouter.post("/new-endpoint", auth, (c) => authController.newEndpoint(c));
  
  return v1Router;
}
```

## Benefits

### 1. **Clear Separation**
- Documentation is separate from functionality
- Easy to maintain and update
- No confusion about what each file does

### 2. **No Duplication**
- Each endpoint defined once for documentation
- Each route defined once for handling
- Single source of truth for each concern

### 3. **Easy to Understand**
- Schema files are clearly marked as documentation-only
- Route files contain actual business logic
- Clear comments explain the purpose

### 4. **Maintainable**
- Update schemas without affecting functionality
- Update routes without affecting documentation
- Easy to add new endpoints

This structure follows our CODE_STYLE principles of **separation of concerns**, **no duplication**, and **simplicity**!
