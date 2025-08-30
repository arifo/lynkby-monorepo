import { Context, Next } from "hono";
import { createError } from "../errors";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (c: Context) => string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (c: Context, next: Next) => {
    const key = finalConfig.keyGenerator?.(c) || generateKey(c);
    const limitKey = `rate_limit:${key}`;
    
    try {
      // Get current request count from KV
      const current = await c.env.KV_CACHE.get(limitKey);
      const requestCount = current ? parseInt(current) : 0;
      
      if (requestCount >= finalConfig.maxRequests) {
        throw createError.rateLimited(
          `Rate limit exceeded. Maximum ${finalConfig.maxRequests} requests per ${finalConfig.windowMs / 1000 / 60} minutes.`
        );
      }
      
      // Increment request count
      const newCount = requestCount + 1;
      await c.env.KV_CACHE.put(limitKey, newCount.toString(), {
        expirationTtl: Math.ceil(finalConfig.windowMs / 1000)
      });
      
      // Add rate limit headers
      c.header("X-RateLimit-Limit", finalConfig.maxRequests.toString());
      c.header("X-RateLimit-Remaining", Math.max(0, finalConfig.maxRequests - newCount).toString());
      c.header("X-RateLimit-Reset", (Date.now() + finalConfig.windowMs).toString());
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      // If KV is unavailable, continue without rate limiting
      console.warn("Rate limiting unavailable, continuing without limits");
    }
    
    await next();
  };
};

// Generate rate limit key based on IP and optional user ID
function generateKey(c: Context): string {
  const ip = c.req.header("CF-Connecting-IP") || 
             c.req.header("X-Forwarded-For") || 
             "unknown";
  
  const userId = c.get("userId") || "anonymous";
  
  return `${ip}:${userId}`;
}

// Specific rate limit configurations
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 5 requests per 15 minutes
  },
  
  // Moderate rate limiting for public API endpoints
  public: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 100 requests per 15 minutes
  },
  
  // Loose rate limiting for authenticated endpoints
  authenticated: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000, // 1000 requests per 15 minutes
  },
  
  // Very strict rate limiting for webhook endpoints
  webhook: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  },
};
