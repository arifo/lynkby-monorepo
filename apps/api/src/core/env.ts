import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  APP_API_BASE: z.string().url().default("http://localhost:3001"),
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
});

export type EnvVars = z.infer<typeof EnvSchema>;

export const parseEnv = (env: unknown): EnvVars => EnvSchema.parse(env);

// Cloudflare bindings interface
export interface Bindings {
  // Cache and storage
  KV_CACHE: KVNamespace;
  R2_ASSETS: R2Bucket;
  
  // Background processing
  QUEUE_TIKTOK_SYNC: Queue;
  
  // Database (if using D1)
  DB: D1Database | undefined;
  
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

// Reserved usernames that cannot be used
export const RESERVED_USERNAMES = new Set([
  "", "www", "app", "api", "static", "cdn", "help", "admin", "status", "docs",
  "login", "logout", "signup", "auth", "dashboard", "profile", "settings"
]);

// JWT configuration constants
export const JWT_CONFIG = {
  ALGORITHM: "HS256" as const,
  DEFAULT_EXPIRES_IN: "7d",
  REFRESH_EXPIRES_IN: "30d",
} as const;

// Database configuration constants
export const DB_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  QUERY_TIMEOUT: 30000, // 30 seconds
  CONNECTION_POOL_SIZE: 5,
} as const;
