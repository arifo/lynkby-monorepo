# Lynkby Code Style Guide

## Overview

This document establishes the coding standards and architectural principles for the Lynkby monorepo. These principles ensure consistency, maintainability, and scalability across all modules and services.

## Core Principles

### 1. **DRY (Don't Repeat Yourself)**
- **Rule**: Never duplicate logic across multiple files
- **Implementation**: Extract common functionality into reusable services
- **Example**: Rate limiting, validation, error handling, logging

### 2. **Single Responsibility Principle (SRP)**
- **Rule**: Each class, service, or module should have one reason to change
- **Implementation**: Separate concerns into focused, specialized components
- **Example**: Auth service handles authentication, rate limiting service handles rate limiting

### 3. **Reusability**
- **Rule**: Design components to be reusable across different modules
- **Implementation**: Create generic services in `core/` that can be used anywhere
- **Example**: Rate limiting, database operations, email sending

### 4. **Consistency**
- **Rule**: Same functionality should behave identically everywhere
- **Implementation**: Use centralized services and standardized interfaces
- **Example**: All rate limiting uses the same service and configuration

### 5. **Maintainability**
- **Rule**: Changes should only need to be made in one place
- **Implementation**: Centralized logic with clear interfaces
- **Example**: Update rate limiting logic once, affects entire application

### 6. **Testability**
- **Rule**: All components should be easily mockable and testable
- **Implementation**: Dependency injection, interface-based design
- **Example**: Mock services for unit testing, clear separation of concerns

### 7. **Simplicity First**
- **Rule**: Solve the actual problem, keep it simple, make it easy to understand
- **Implementation**: Avoid over-engineering, unnecessary abstractions, and complex solutions
- **Example**: Direct route definitions instead of multiple layers of abstraction

## File Organization

### Directory Structure

```
src/
├── core/                          # Shared, reusable components
│   ├── services/                  # Business logic services
│   │   ├── rate-limit.service.ts  # Cross-cutting concerns
│   │   ├── email.service.ts       # External integrations
│   │   ├── database.service.ts    # Data access
│   │   └── base.service.ts        # Common service functionality
│   ├── middleware/                # HTTP middleware
│   │   ├── rate-limit.ts          # Uses core services
│   │   ├── auth.ts                # Authentication middleware
│   │   └── validation.ts          # Request validation
│   ├── repositories/              # Data access layer
│   │   ├── base.repository.ts     # Common repository functionality
│   │   ├── user.repository.ts     # User-specific data access
│   │   └── page.repository.ts     # Page-specific data access
│   ├── util/                      # Utility functions
│   │   ├── logger.ts              # Logging utilities
│   │   ├── token.utils.ts         # JWT utilities
│   │   └── ip.utils.ts            # IP address utilities
│   └── errors.ts                  # Error handling
├── features/                      # Feature-specific modules
│   ├── auth/                      # Authentication feature
│   │   ├── auth.service.ts        # Auth business logic
│   │   ├── auth.controller.ts     # HTTP request handling
│   │   ├── auth.container.ts      # Dependency injection
│   │   ├── auth.interfaces.ts     # Type definitions
│   │   ├── auth.types.ts          # Data types
│   │   ├── auth.schemas.ts        # Validation schemas
│   │   └── index.ts               # Module exports
│   └── [other-features]/          # Other feature modules
└── endpoints/                     # HTTP route definitions
    ├── healthCheck.ts             # Health check endpoint
    └── v1/                        # API version 1
        └── auth/                  # Auth endpoints
```

### File Naming Conventions

- **Services**: `*.service.ts` (e.g., `rate-limit.service.ts`)
- **Controllers**: `*.controller.ts` (e.g., `auth.controller.ts`)
- **Repositories**: `*.repository.ts` (e.g., `user.repository.ts`)
- **Interfaces**: `*.interfaces.ts` (e.g., `auth.interfaces.ts`)
- **Types**: `*.types.ts` (e.g., `auth.types.ts`)
- **Schemas**: `*.schemas.ts` (e.g., `auth.schemas.ts`)
- **Containers**: `*.container.ts` (e.g., `auth.container.ts`)
- **Middleware**: `*.ts` (e.g., `rate-limit.ts`, `auth.ts`)

## Service Architecture

### Service Hierarchy

```
BaseService (core/services/base.service.ts)
├── DatabaseService (core/services/database.service.ts)
├── EmailService (core/services/email.service.ts)
├── RateLimitService (core/services/rate-limit.service.ts)
└── Feature Services (features/*/auth.service.ts)
```

### Service Design Pattern

```typescript
// 1. Define interface
export interface IMyService {
  doSomething(param: string): Promise<Result>;
  setEnvironment(env: AppEnv): void;
}

// 2. Implement service
export class MyService extends BaseService implements IMyService {
  async doSomething(param: string): Promise<Result> {
    // Implementation
  }
}

// 3. Export singleton
export const myService = new MyService();
```

### Dependency Injection Pattern

```typescript
// 1. Create container
export class MyContainer {
  private myService: IMyService;
  private myController: IMyController;

  constructor(config: MyConfig) {
    this.myService = new MyService();
    this.myController = new MyController(this.myService, config);
  }

  getMyService(): IMyService { return this.myService; }
  getMyController(): IMyController { return this.myController; }
}

// 2. Factory function
export function createMyContainer(env: AppEnv): MyContainer {
  return new MyContainer(createConfig(env));
}
```

## Cross-Cutting Concerns

### Rate Limiting

**Location**: `core/services/rate-limit.service.ts`
**Usage**: All modules use the same rate limiting service

```typescript
// In middleware
import { rateLimit, rateLimitConfigs } from '../core/middleware/rate-limit';

// In services
import { rateLimitService, rateLimitConfigs } from '../core/services/rate-limit.service';
```

### Error Handling

**Location**: `core/errors.ts`
**Usage**: Standardized error creation and handling

```typescript
import { createError } from '../core/errors';

throw createError.validationError("Invalid input");
throw createError.unauthorized("Access denied");
throw createError.rateLimited("Too many requests");
```

### Logging

**Location**: `core/util/logger.ts`
**Usage**: Consistent logging across all services

```typescript
import { logger } from '../core/util/logger';

logger.info("Operation completed", { userId, operation });
logger.warn("Rate limit exceeded", { ip, endpoint });
logger.error("Database error", { error, query });
```

### Database Access

**Location**: `core/services/database.service.ts`
**Usage**: All database operations go through the centralized service

```typescript
import { databaseService } from '../core/services/database.service';

const users = await databaseService.query<User>('SELECT * FROM users WHERE id = $1', [id]);
await databaseService.execute('UPDATE users SET last_login = $1 WHERE id = $2', [now, id]);
```

## Interface Design

### Service Interfaces

```typescript
// Always define interfaces for services
export interface IMyService {
  // Public methods only
  publicMethod(param: string): Promise<Result>;
  setEnvironment(env: AppEnv): void;
  
  // No private methods in interface
}
```

### Configuration Interfaces

```typescript
// Centralized configuration
export interface MyModuleConfig {
  requiredSetting: string;
  optionalSetting?: string;
  environmentSpecific: {
    development: string;
    production: string;
  };
}
```

## Testing Standards

### Mocking Strategy

```typescript
// Create mock implementations
const mockMyService: IMyService = {
  doSomething: jest.fn().mockResolvedValue(mockResult),
  setEnvironment: jest.fn(),
};

// Inject mocks
const controller = new MyController(mockMyService, testConfig);
```

### Test Organization

```
tests/
├── unit/                          # Unit tests
│   ├── services/                  # Service tests
│   ├── controllers/               # Controller tests
│   └── repositories/              # Repository tests
├── integration/                   # Integration tests
│   ├── api/                       # API endpoint tests
│   └── database/                  # Database tests
└── e2e/                          # End-to-end tests
```

## Code Quality Rules

### 1. **No Duplication**
- ❌ **Bad**: Copy-paste code between files
- ✅ **Good**: Extract to shared service/utility

### 2. **Single Responsibility**
- ❌ **Bad**: One class handling multiple concerns
- ✅ **Good**: Separate classes for separate concerns

### 3. **Interface-Based Design**
- ❌ **Bad**: Direct class dependencies
- ✅ **Good**: Interface dependencies with injection

### 4. **Centralized Configuration**
- ❌ **Bad**: Hardcoded values scattered throughout
- ✅ **Good**: Centralized config with environment support

### 5. **Consistent Error Handling**
- ❌ **Bad**: Different error formats in different places
- ✅ **Good**: Standardized error creation and handling

### 6. **Proper Logging**
- ❌ **Bad**: Console.log statements everywhere
- ✅ **Good**: Structured logging with context

### 7. **Avoid Over-Engineering**
- ❌ **Bad**: Multiple layers of abstraction for simple problems
- ✅ **Good**: Direct, simple solutions that solve the actual problem

## Migration Guidelines

### When Adding New Features

1. **Identify Cross-Cutting Concerns**: Is this logic used in multiple places?
2. **Create Core Service**: If yes, put in `core/services/`
3. **Define Interfaces**: Always create interfaces for services
4. **Use Dependency Injection**: Inject dependencies through constructor
5. **Follow Naming Conventions**: Use consistent file and class names
6. **Add Tests**: Create unit tests with proper mocking

### When Refactoring Existing Code

1. **Identify Duplication**: Find repeated logic across files
2. **Extract to Core**: Move common logic to `core/services/`
3. **Update Dependencies**: Use dependency injection
4. **Maintain Interfaces**: Keep existing interfaces or create new ones
5. **Update Tests**: Ensure tests still pass after refactoring

## Examples

### ✅ Good Example: Centralized Rate Limiting

```typescript
// core/services/rate-limit.service.ts
export class RateLimitService extends BaseService {
  async checkRateLimit(context: Context, config: RateLimitConfig): Promise<RateLimitResult> {
    // Single implementation used everywhere
  }
}

// core/middleware/rate-limit.ts
export const rateLimit = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    const result = await rateLimitService.checkRateLimit(c, config);
    // Handle result
  };
};

// features/auth/auth.controller.ts
export class AuthController {
  async requestMagicLink(c: Context) {
    const result = await rateLimitService.checkEmailRateLimit(/* ... */);
    // Use result
  }
}
```

### ❌ Bad Example: Duplicated Logic

```typescript
// features/auth/auth.service.ts
export class AuthService {
  async checkRateLimit(email: string): Promise<boolean> {
    // Duplicate rate limiting logic
  }
}

// core/middleware/rate-limit.ts
export const rateLimit = (config) => {
  return async (c: Context, next: Next) => {
    // Different rate limiting logic
  };
};

// features/api/api.service.ts
export class ApiService {
  async checkRateLimit(ip: string): Promise<boolean> {
    // Yet another rate limiting implementation
  }
}
```

### ❌ Bad Example: Over-Engineering

```typescript
// Overcomplicated route management with multiple abstractions
export class RouteHandler {
  registerRouteGroup(groupName: string, config: RouteGroupConfig): void
  applyAllRoutes(): void
  private registerRoute(router: Hono, route: RouteConfig): void
}

export class RouteRegistry {
  register(name: string, registrar: IRouteRegistrar): void
  getAllRouteGroups(): Map<string, RouteGroupConfig>
}

export class RouteManager {
  initializeRoutes(): void
  registerAuthRoutes(authController: any): void
}
```

### ✅ Good Example: Simple and Direct

```typescript
// Simple, direct route definition
export function createV1Router(authController: any): Hono<{ Bindings: AppEnv }> {
  const v1Router = new Hono<{ Bindings: AppEnv }>();
  
  const authRouter = new Hono<{ Bindings: AppEnv }>();
  authRouter.post("/request-link", rateLimit({...}), (c) => authController.requestMagicLink(c));
  authRouter.get("/me", auth, (c) => authController.getCurrentUser(c));
  
  v1Router.route("/auth", authRouter);
  return v1Router;
}
```

## Enforcement

### Code Review Checklist

- [ ] No duplicate logic across files
- [ ] Each class has single responsibility
- [ ] Services are in `core/` if reusable
- [ ] Interfaces are defined for all services
- [ ] Dependency injection is used
- [ ] Error handling is consistent
- [ ] Logging is structured
- [ ] Tests are included
- [ ] Configuration is centralized
- [ ] Solution is simple and solves the actual problem
- [ ] No unnecessary abstractions or over-engineering
- [ ] Code is easy to understand and maintain

### Automated Checks

- ESLint rules for consistent code style
- TypeScript strict mode enabled
- Unit tests required for new services
- Integration tests for API endpoints

## Conclusion

This code style guide ensures that the Lynkby codebase remains:
- **Maintainable**: Easy to understand and modify
- **Scalable**: Can grow without becoming unwieldy
- **Testable**: Easy to test and debug
- **Consistent**: Predictable patterns throughout
- **Reusable**: Components can be used in multiple contexts

Follow these principles for all future development to maintain code quality and architectural consistency.
