import * as Sentry from "@sentry/cloudflare";
import type { AppEnv } from "./env";
import { SecurityUtils } from "./env";

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
    console.error("Invalid Sentry DSN format:", SecurityUtils.maskSecret(env.SENTRY_DSN, "url"));
    // Return minimal config to avoid TypeScript errors
    return {
      dsn: "https://dummy@dummy.ingest.sentry.io/dummy",
      enabled: false,
    };
  }

  // Only log on first initialization to reduce noise
  if (!(globalThis as any).__SENTRY_INITIALIZED__) {
    console.log("Initializing Sentry for error tracking only");
    (globalThis as any).__SENTRY_INITIALIZED__ = true;
  }
  
  const { id: versionId } = env.CF_VERSION_METADATA || { id: "unknown" };

  return {
    dsn: env.SENTRY_DSN,
    release: versionId,
    
    // Minimal performance monitoring
    tracesSampleRate: 0.01, // Only 1% for critical errors
    profilesSampleRate: 0, // Disable profiles
    
    // Disable console logging - let Cloudflare handle it
    enableLogs: false,
    
    // No integrations - just pure error tracking
    integrations: [],
    
    // Minimal context
    sendDefaultPii: false,
    
    // Environment
    environment: env.NODE_ENV || "development",
    
    // Always disable debug mode
    debug: false,
    
    // Minimal tags
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

// Utility function to capture messages (only for errors)
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "error", context?: Record<string, any>) => {
  // Only capture error and fatal messages
  if (level !== "error" && level !== "fatal") {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    return;
  }

  if (!SENTRY_CONFIG.ENABLED) {
    console.error("Sentry disabled, error logged to console:", message, context);
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
    console.error(`[${level.toUpperCase()}] ${message}`, context);
  }
};

// Utility function to add breadcrumbs (minimal)
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
    // Silently fail - breadcrumbs are not critical
  }
};

// Export Sentry instance for direct use if needed
export { Sentry };

// Note: Sentry is now configured for error tracking only.
// All other logging should use Cloudflare's console for better performance.
