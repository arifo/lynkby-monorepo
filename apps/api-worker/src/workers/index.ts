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
    try {
      console.log("🚀 Worker fetch handler called");
      // console.log("Environment keys:", Object.keys(env));
      
      const app = createApp(env);
      return app.fetch(request, env, ctx);
    } catch (error) {
      console.error("❌ Worker fetch handler error:", error);
      
      // Return a proper error response
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to initialize application",
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
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
