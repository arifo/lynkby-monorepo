import * as Sentry from "@sentry/cloudflare";
import type { AppEnv } from "./env";

// Sentry configuration constants
export const SENTRY_CONFIG = {
  ENABLED: true,
  TRACES_SAMPLE_RATE: 0.1,
  PROFILES_SAMPLE_RATE: 0.1,
  DEBUG: false,
} as const;

// Sentry configuration function for Cloudflare Workers
export function createSentryConfig(env: AppEnv) {
  // Validate Sentry DSN
  if (!env.SENTRY_DSN) {
    console.warn("Sentry DSN not configured. Sentry monitoring will be disabled.");
    // Return minimal config to avoid TypeScript errors
    return {
      dsn: "https://dummy@dummy.ingest.sentry.io/dummy",
      enabled: false,
    };
  }

  try {
    // Validate DSN format
    const dsnUrl = new URL(env.SENTRY_DSN);
    if (!dsnUrl.hostname.includes('sentry.io')) {
      throw new Error('Invalid Sentry DSN format');
    }
  } catch (error) {
    console.error("Invalid Sentry DSN format:", env.SENTRY_DSN);
    // Return minimal config to avoid TypeScript errors
    return {
      dsn: "https://dummy@dummy.ingest.sentry.io/dummy",
      enabled: false,
    };
  }

  console.log("Initializing Sentry with DSN:", env.SENTRY_DSN.replace(/\/\/[^@]+@/, '//***@'));
  const { id: versionId } = env.CF_VERSION_METADATA || { id: "unknown" };

  return {
    dsn: env.SENTRY_DSN,
    release: versionId,
    
    // Enable performance monitoring
    tracesSampleRate: SENTRY_CONFIG.TRACES_SAMPLE_RATE,
    profilesSampleRate: SENTRY_CONFIG.PROFILES_SAMPLE_RATE,
    
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
    
    // Add context about the worker
    initialScope: {
      tags: {
        worker: "lynkby-api",
        environment: env.NODE_ENV || "development",
      },
    },
  };
}

// Utility function to capture errors with context
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (!SENTRY_CONFIG.ENABLED) {
    console.error("Sentry disabled, error logged to console:", error.message, context);
    return;
  }

  try {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        source: "lynkby-api",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (sentryError) {
    console.error("Failed to send error to Sentry:", sentryError);
    console.error("Original error:", error.message, context);
  }
};

// Utility function to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info", context?: Record<string, any>) => {
  if (!SENTRY_CONFIG.ENABLED) {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    return;
  }

  try {
    Sentry.captureMessage(message, {
      level,
      extra: context,
      tags: {
        source: "lynkby-api",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (sentryError) {
    console.error("Failed to send message to Sentry:", sentryError);
    console.log(`[${level.toUpperCase()}] ${message}`, context);
  }
};

// Utility function to add breadcrumbs
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  if (!SENTRY_CONFIG.ENABLED) {
    return;
  }

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
      timestamp: Date.now() / 1000,
    });
  } catch (sentryError) {
    console.error("Failed to add breadcrumb to Sentry:", sentryError);
  }
};

// Export Sentry instance for direct use if needed
export { Sentry };

// Note: For Cloudflare Workers, Sentry should be initialized using the withSentry wrapper
// in the main worker file, not through Sentry.init() in a separate module.
// See the updated workers/index.ts for the correct implementation.
