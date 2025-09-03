import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  APP_BASE: z.string().url().default("http://localhost:3001"),
  REVALIDATE_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SENTRY_DSN: z.string().url().optional(),
  
  // Database configuration
  DATABASE_URL: z.string().url("Database URL is required"),
  DIRECT_URL: z.string().url("Direct database URL is required for Prisma Accelerate"),
  
  // External service keys
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  
  // Email provider (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),
  APP_NAME: z.string().optional(),
});

export type EnvVars = z.infer<typeof EnvSchema>;

// Cloudflare bindings interface
export interface Bindings {
  // Cache and storage
  KV_CACHE: KVNamespace;
  R2_ASSETS: R2Bucket;
  
  // Background processing
  QUEUE_TIKTOK_SYNC: Queue;
  
  // Database (Hyperdrive)
  HYPERDRIVE: {
    connectionString: string;
  };
  
  // AI (if using Cloudflare AI)
  AI: unknown;
  
  // Sentry version metadata
  CF_VERSION_METADATA: {
    id: string;
    version: string;
  };
}

// Combined environment type
export type AppEnv = EnvVars & Bindings;

// Export the schema for external validation
export { EnvSchema };
