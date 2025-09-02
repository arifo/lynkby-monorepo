import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { validateEnv, type AppEnv } from "./core/env";
import { errorHandler } from "./core/errors";
import mainRouter from "./routes";

export function createApp(env: unknown): Hono<{ Bindings: AppEnv }> {
  const app = new Hono<{ Bindings: AppEnv }>();
  
  // Validate environment variables once at startup
  const parsedEnv = validateEnv(env);
  
  // Global middleware
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
  
  // Routes
  app.route("/", mainRouter);

  // Error handling
  app.onError(errorHandler);
  
  return app;
}
