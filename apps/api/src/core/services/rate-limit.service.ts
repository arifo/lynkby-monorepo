import { logger } from "../util/logger";
import { BaseService } from "./base.service";
import type { AppEnv } from "../env";
import type { Context } from "hono";

/**
 * Rate limit state information
 */
export interface RateLimitState {
  remaining: number;
  resetTime: number;
  cooldown: number;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (c: Context) => string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  cooldown: number;
  headers: {
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
  };
}

/**
 * Comprehensive rate limiting service
 * Handles all rate limiting operations across the application
 */
export class RateLimitService extends BaseService {
  
  /**
   * Check and enforce rate limiting for a request
   */
  async checkRateLimit(
    context: Context, 
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator?.(context) || this.generateDefaultKey(context);
    const limitKey = `rate_limit:${key}`;
    
    try {
      // Check if KV_CACHE is available
      if (!context.env.KV_CACHE) {
        logger.warn("KV_CACHE not available, allowing request without rate limiting");
        return this.createAllowedResult(config);
      }
      
      // Get current request count from KV
      const current = await context.env.KV_CACHE.get(limitKey);
      const requestCount = current ? parseInt(current) : 0;
      
      if (requestCount >= config.maxRequests) {
        const resetTime = Date.now() + config.windowMs;
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          cooldown: Math.ceil(config.windowMs / 1000),
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
          }
        };
      }
      
      // Increment request count
      const newCount = requestCount + 1;
      const resetTime = Date.now() + config.windowMs;
      
      await context.env.KV_CACHE.put(limitKey, newCount.toString(), {
        expirationTtl: Math.ceil(config.windowMs / 1000)
      });
      
      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - newCount),
        resetTime,
        cooldown: 0,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, config.maxRequests - newCount).toString(),
          'X-RateLimit-Reset': resetTime.toString(),
        }
      };
      
    } catch (error) {
      logger.warn("Rate limiting failed, allowing request", { error, key });
      // If rate limiting fails, allow the request
      return this.createAllowedResult(config);
    }
  }

  /**
   * Check rate limiting for email requests (auth-specific)
   */
  async checkEmailRateLimit(
    email: string, 
    ipAddress: string, 
    context: Context,
    emailConfig: RateLimitConfig,
    ipConfig: RateLimitConfig
  ): Promise<RateLimitState> {
    const now = Date.now();
    
    // Check per-email rate limit
    const emailKey = `rate_limit:email:${email}`;
    const emailLimit = await this.getRateLimitState(emailKey, emailConfig, context);
    
    // Check per-IP rate limit
    const ipKey = `rate_limit:ip:${ipAddress}`;
    const ipLimit = await this.getRateLimitState(ipKey, ipConfig, context);
    
    // Return the more restrictive limit
    if (emailLimit.cooldown > 0) {
      return emailLimit;
    }
    
    if (ipLimit.cooldown > 0) {
      return ipLimit;
    }
    
    return {
      remaining: Math.min(emailLimit.remaining, ipLimit.remaining),
      resetTime: Math.max(emailLimit.resetTime, ipLimit.resetTime),
      cooldown: 0
    };
  }

  /**
   * Get rate limit state from KV
   */
  private async getRateLimitState(
    key: string, 
    config: RateLimitConfig,
    context: Context
  ): Promise<RateLimitState> {
    try {
      if (!context.env.KV_CACHE) {
        return {
          remaining: config.maxRequests,
          resetTime: Date.now() + config.windowMs,
          cooldown: 0
        };
      }

      const val = await context.env.KV_CACHE.get(key);
      if (!val) {
        return {
          remaining: config.maxRequests,
          resetTime: Date.now() + config.windowMs,
          cooldown: 0
        };
      }

      const requestCount = parseInt(val) || 0;
      const remaining = Math.max(0, config.maxRequests - requestCount);
      const resetTime = Date.now() + config.windowMs;
      
      if (requestCount >= config.maxRequests) {
        return {
          remaining: 0,
          resetTime,
          cooldown: Math.ceil(config.windowMs / 1000)
        };
      }

      return {
        remaining,
        resetTime,
        cooldown: 0
      };
    } catch (error) {
      logger.warn("Failed to check rate limit", { key, error });
      // If rate limiting fails, allow the request
      return {
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        cooldown: 0
      };
    }
  }

  /**
   * Generate default rate limit key based on IP and optional user ID
   */
  private generateDefaultKey(context: Context): string {
    const ip = context.req.header("CF-Connecting-IP") || 
               context.req.header("X-Forwarded-For") || 
               "unknown";
    
    const userId = context.get("userId") || "anonymous";
    
    return `${ip}:${userId}`;
  }

  /**
   * Create allowed result when rate limiting is disabled
   */
  private createAllowedResult(config: RateLimitConfig): RateLimitResult {
    const resetTime = Date.now() + config.windowMs;
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime,
      cooldown: 0,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': config.maxRequests.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
      }
    };
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Predefined rate limit configurations
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

  // Email-specific rate limiting
  emailPerAddress: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 3 emails per hour per address
  },

  emailPerIP: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 10 emails per hour per IP
  },
};
