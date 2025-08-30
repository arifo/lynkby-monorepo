import * as Sentry from "@sentry/cloudflare";

// Sentry configuration constants
export const SENTRY_CONFIG = {
  ENABLED: true,
  TRACES_SAMPLE_RATE: 0.1,
  PROFILES_SAMPLE_RATE: 0.1,
  DEBUG: false,
} as const;

// Export Sentry instance for direct use if needed
export { Sentry };

// Note: For Cloudflare Workers, Sentry should be initialized using the withSentry wrapper
// in the main worker file, not through Sentry.init() in a separate module.
// See the updated workers/index.ts for the correct implementation.
