import * as Sentry from "@sentry/cloudflare";
import { createApp } from "../app";
import { handleQueue } from "./queue";
import { handleScheduled } from "./scheduled";
import type { AppEnv } from "../core/env";
import type { QueueMessage } from "./queue";

// Main fetch handler for HTTP requests
const worker = {
  async fetch(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
    const app = createApp(env);
    return app.fetch(request, env, ctx);
  },

  // Queue consumer for background processing
  async queue(batch: MessageBatch<QueueMessage>, env: AppEnv): Promise<void> {
    return handleQueue(batch, env);
  },

  // Scheduled tasks (cron jobs)
  async scheduled(controller: ScheduledController, env: AppEnv, ctx: ExecutionContext): Promise<void> {
    return handleScheduled(controller, env, ctx);
  },
};

// Wrap the worker with Sentry for error monitoring and tracing
export default Sentry.withSentry(
  (env: AppEnv) => {
    console.log("Sentry SENTRY_DSN", env.SENTRY_DSN);
    const { id: versionId } = env.CF_VERSION_METADATA || { id: "unknown" };

    return {
      dsn: env.SENTRY_DSN,
      release: versionId,
      
      // Enable performance monitoring
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      
      // Enable logs
      enableLogs: true,
      integrations: [
        // send console.log, console.warn, and console.error calls as logs to Sentry
        Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
      ],
      
      // Add request headers and IP for users
      sendDefaultPii: true,
      
      // Environment
      environment: env.NODE_ENV || "development",
      
      // Debug mode for development
      debug: env.NODE_ENV === "development",
    };
  },
  worker
);
