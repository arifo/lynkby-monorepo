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

// Simple environment validation function
export function validateEnv(env: unknown): EnvVars {
  try {
    // For Cloudflare Workers, env contains both bindings and environment variables
    // Extract only the string environment variables
    const envVars: Record<string, string | undefined> = {};
    
    if (env && typeof env === 'object') {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          envVars[key] = value;
        }
      }
    }
    
    console.log("🔐 Validating environment variables...");
    console.log("Available keys:", Object.keys(envVars));
    
    const validated = EnvSchema.parse(envVars);
    
    console.log("✅ Environment loaded successfully");
    console.log(`   Environment: ${validated.NODE_ENV}`);
    console.log(`   Database: ${validated.DATABASE_URL ? "✅ Configured" : "❌ Missing"}`);
    console.log(`   JWT: ${validated.JWT_SECRET ? "✅ Configured" : "❌ Missing"}`);
    
    return validated;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      error.errors.forEach((err) => {
        console.error(`   ${err.path.join(".")}: ${err.message}`);
      });
    }
    throw new Error("Failed to load environment variables. Check configuration.");
  }
}

// Export the schema for external validation
export { EnvSchema };
