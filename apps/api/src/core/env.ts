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
  RESEND_API_KEY: z.string().min(1, "Resend API key is required for OTP emails"),
  EMAIL_FROM: z.string().email().default("noreply@lynkby.com"),
  SUPPORT_EMAIL: z.string().email().optional(),
  APP_NAME: z.string().default("Lynkby"),
  
  // OTP configuration
  OTP_CODE_LENGTH: z.number().min(4).max(8).default(6),
  OTP_TTL_MINUTES: z.number().min(1).max(60).default(10),
  OTP_MAX_ATTEMPTS: z.number().min(1).max(10).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.number().min(10).max(300).default(30),
  
  // CSRF configuration
  CSRF_SECRET: z.string().min(32, "CSRF secret must be at least 32 characters").optional(),
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
