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

// Security utilities for sensitive data
export const SecurityUtils = {
  // Mask sensitive values in logs
  maskSecret: (value: string, type: "url" | "key" | "secret" = "secret"): string => {
    if (!value) return "undefined";
    
    switch (type) {
      case "url":
        try {
          const url = new URL(value);
          return `${url.protocol}//***@${url.hostname}${url.pathname}`;
        } catch {
          return "***";
        }
      case "key":
        if (value.startsWith("sk_") || value.startsWith("pk_")) {
          return `${value.substring(0, 7)}...${value.substring(value.length - 4)}`;
        }
        return value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : "***";
      case "secret":
      default:
        return value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : "***";
    }
  },

  // Validate and load environment variables securely
  loadEnvSecurely: (env: Record<string, string | undefined>): EnvVars => {
    try {
      const envVars = EnvSchema.parse(env);
      
      // Log configuration status (without exposing sensitive data)
      console.log("🔐 Environment loaded successfully");
      console.log(`   Environment: ${envVars.NODE_ENV}`);
      console.log(`   Database: ${envVars.DATABASE_URL ? "✅ Configured" : "❌ Missing"}`);
      console.log(`   JWT: ${envVars.JWT_SECRET ? "✅ Configured" : "❌ Missing"}`);
      console.log(`   Sentry: ${envVars.SENTRY_DSN ? "✅ Configured" : "❌ Missing"}`);
      console.log(`   Stripe: ${envVars.STRIPE_SECRET_KEY ? "✅ Configured" : "❌ Missing"}`);
      console.log(`   TikTok: ${envVars.TIKTOK_CLIENT_KEY ? "✅ Configured" : "❌ Missing"}`);
      
      return envVars;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Environment validation failed:");
        error.errors.forEach((err) => {
          console.error(`   ${err.path.join(".")}: ${err.message}`);
        });
      }
      throw new Error("Failed to load environment variables. Check configuration.");
    }
  },

  // Get environment variables for Cloudflare Workers
  getWorkerEnv: (env: any): EnvVars => {
    return SecurityUtils.loadEnvSecurely({
      NODE_ENV: env.NODE_ENV,
      APP_API_BASE: env.APP_API_BASE,
      REVALIDATE_SECRET: env.REVALIDATE_SECRET,
      JWT_SECRET: env.JWT_SECRET,
      JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
      SENTRY_DSN: env.SENTRY_DSN,
      DATABASE_URL: env.DATABASE_URL,
      DIRECT_URL: env.DIRECT_URL,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
      TIKTOK_CLIENT_KEY: env.TIKTOK_CLIENT_KEY,
      TIKTOK_CLIENT_SECRET: env.TIKTOK_CLIENT_SECRET,
    });
  },

  // Get environment variables for Node.js (scripts, etc.)
  getNodeEnv: (): EnvVars => {
    return SecurityUtils.loadEnvSecurely(process.env);
  },
} as const;

// Export the schema for external validation
export { EnvSchema };
