import * as Sentry from "@sentry/cloudflare";
import { createApp } from "../app";
import { handleQueue } from "./queue";
import { handleScheduled } from "./scheduled";
import type { AppEnv } from "../core/env";
import type { QueueMessage } from "./queue";
import { setupGracefulShutdown } from "../core/db";
import { createSentryConfig } from "../core/sentry";

// Setup graceful shutdown for development
if (typeof process !== 'undefined') {
  setupGracefulShutdown();
}

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

// Export the worker with optimized Sentry wrapper
export default Sentry.withSentry(createSentryConfig, worker);
