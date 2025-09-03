# Simple Route Management

This directory contains simple, clean route definitions that follow our CODE_STYLE principles without overcomplicating things.

## Structure

```
routes/
├── v1.ts                    # V1 API routes
└── README.md               # This documentation
```

## Key Features

### 1. **Simple and Clean**
- No overcomplicated abstractions
- Direct route definitions
- Easy to understand and maintain

### 2. **Dependency Injection**
- Controllers are injected into route factories
- Easy to test and mock
- Clear separation of concerns

### 3. **Centralized Configuration**
- All routes in one place
- Consistent middleware application
- Easy to add new routes

## Usage

### Basic Setup

```typescript
// Create router with injected controller
const authContainer = getAuthContainer();
const v1Router = createV1Router(authContainer.getAuthController());

// Mount routes
app.route("/v1", v1Router);
```

### Adding New Routes

```typescript
// In v1.ts
export function createV1Router(authController: any, pagesController?: any): Hono<{ Bindings: AppEnv }> {
  const v1Router = new Hono<{ Bindings: AppEnv }>();

  // Auth routes
  const authRouter = new Hono<{ Bindings: AppEnv }>();
  authRouter.post("/request-link", rateLimit({...}), (c) => authController.requestMagicLink(c));
  v1Router.route("/auth", authRouter);

  // Pages routes (when ready)
  if (pagesController) {
    const pagesRouter = new Hono<{ Bindings: AppEnv }>();
    pagesRouter.get("/", auth, (c) => pagesController.getAll(c));
    pagesRouter.post("/", auth, (c) => pagesController.create(c));
    v1Router.route("/pages", pagesRouter);
  }

  return v1Router;
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
- Controllers are injected
- Easy to mock dependencies
- Clear interfaces

### 4. **Flexibility**
- Easy to add new route groups
- Simple middleware application
- No complex configuration

## Route Structure

```typescript
// Simple route definition
authRouter.post(
  "/request-link",
  rateLimit({...}),  // Middleware
  (c) => authController.requestMagicLink(c)  // Handler
);

// Protected route
authRouter.get(
  "/me",
  auth,  // Auth middleware
  (c) => authController.getCurrentUser(c)
);
```

## Adding New Route Groups

1. **Create router function**:
```typescript
function createPagesRouter(pagesController: any): Hono<{ Bindings: AppEnv }> {
  const pagesRouter = new Hono<{ Bindings: AppEnv }>();
  
  pagesRouter.get("/", auth, (c) => pagesController.getAll(c));
  pagesRouter.post("/", auth, (c) => pagesController.create(c));
  pagesRouter.put("/:id", auth, (c) => pagesController.update(c));
  pagesRouter.delete("/:id", auth, (c) => pagesController.delete(c));
  
  return pagesRouter;
}
```

2. **Add to v1 router**:
```typescript
// In createV1Router function
if (pagesController) {
  v1Router.route("/pages", createPagesRouter(pagesController));
}
```

3. **Update main app**:
```typescript
// In index.ts
const pagesContainer = getPagesContainer();
const v1Router = createV1Router(
  authContainer.getAuthController(),
  pagesContainer.getPagesController()
);
```

This approach is much simpler while still following our CODE_STYLE principles of dependency injection, separation of concerns, and maintainability!
