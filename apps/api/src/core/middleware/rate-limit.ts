import { Context, Next } from "hono";
import { createError } from "../errors";
import { rateLimitService, rateLimitConfigs, type RateLimitConfig } from "../services/rate-limit.service";

/**
 * Rate limiting middleware factory
 * Uses the centralized rate limiting service
 */
export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig: RateLimitConfig = { 
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    ...config 
  };
  
  return async (c: Context, next: Next): Promise<void> => {
    try {
      // Use the centralized rate limiting service
      const result = await rateLimitService.checkRateLimit(c, finalConfig);
      
      // Add rate limit headers
      c.header("X-RateLimit-Limit", result.headers['X-RateLimit-Limit']);
      c.header("X-RateLimit-Remaining", result.headers['X-RateLimit-Remaining']);
      c.header("X-RateLimit-Reset", result.headers['X-RateLimit-Reset']);
      
      if (!result.allowed) {
        throw createError.rateLimited(
          `Rate limit exceeded. Maximum ${finalConfig.maxRequests} requests per ${finalConfig.windowMs / 1000 / 60} minutes.`
        );
      }
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      // If rate limiting fails, continue without limits
      console.warn("Rate limiting unavailable, continuing without limits");
    }
    
    await next();
  };
};

// Re-export configurations for convenience
export { rateLimitConfigs };