import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { parseEnv, type AppEnv } from "./core/env";
import { errorHandler } from "./core/errors";
import mainRouter from "./routes";

export function createApp(env: unknown): Hono<{ Bindings: AppEnv }> {
  const app = new Hono<{ Bindings: AppEnv }>();
  const parsedEnv = parseEnv(env); // Parse and validate environment
  
  // Global middleware
  app.use("*", logger());
  app.use("*", secureHeaders());
  app.use("*", cors({
    origin: ["https://app.lynkby.com", "https://app-dev.lynkby.com", "http://localhost:3000"],
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
