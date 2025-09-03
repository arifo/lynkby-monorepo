import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { errorHandler } from "./core/errors";
import { setupOpenAPI } from "../openapi";
import { createV1Router } from "./routes/v1";
import { getAuthContainer } from "./features/auth";
import type { AppEnv } from "./core/env";
import { secureHeaders } from "hono/secure-headers";

// Start a Hono app
const app = new Hono<{ Bindings: AppEnv }>();

// Add middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", cors({
	origin: [
		"https://app.lynkby.com", 
		"https://app-dev.lynkby.com", 
		"http://localhost:3000",
		"http://localhost:3001", // Add dashboard port
		"https://lynkby.com" // Public site origin
	],
	credentials: true,
	allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
	allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// Create v1 router
const v1Router = createV1Router();

// Add a simple health check route
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Add development info route (only in development)
if (process.env.NODE_ENV === 'development') {
  app.get("/dev", (c) => {
    return c.json({
      environment: "development",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        v1: "/v1",
        docs: "/docs",
        openapi: "/openapi.json"
      },
      features: {
        openapiRoutes: process.env.ENABLE_OPENAPI_ROUTES === 'true' || process.env.NODE_ENV === 'development',
        cors: true,
        rateLimit: true
      }
    });
  });
}

// Mount v1 routes FIRST (higher priority)
app.route("/v1", v1Router);

// Setup OpenAPI documentation (can be disabled in production)
let openapi: any = null;
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_OPENAPI === 'true') {
  openapi = setupOpenAPI(app);
  
  // Mount OpenAPI routes
  app.route("/", openapi);
}

// Add error handler
app.onError(errorHandler);

// Export the Hono app
export default app;
