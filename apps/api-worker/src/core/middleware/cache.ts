import { Context, Next } from "hono";

export interface CacheConfig {
  maxAge: number;
  staleWhileRevalidate?: number;
  public?: boolean;
  private?: boolean;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 300, // 5 minutes
  staleWhileRevalidate: 60, // 1 minute
  public: true,
};

export const cache = (config: Partial<CacheConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  return async (c: Context, next: Next) => {
    // Set cache headers
    if (finalConfig.noStore) {
      c.header("Cache-Control", "no-store");
    } else if (finalConfig.noCache) {
      c.header("Cache-Control", "no-cache");
    } else {
      const directives = [];
      
      if (finalConfig.public) {
        directives.push("public");
      } else if (finalConfig.private) {
        directives.push("private");
      }
      
      directives.push(`max-age=${finalConfig.maxAge}`);
      
      if (finalConfig.staleWhileRevalidate) {
        directives.push(`stale-while-revalidate=${finalConfig.staleWhileRevalidate}`);
      }
      
      if (finalConfig.mustRevalidate) {
        directives.push("must-revalidate");
      }
      
      c.header("Cache-Control", directives.join(", "));
    }
    
    // Set ETag for cache validation
    const etag = generateETag(c.req.url);
    c.header("ETag", etag);
    
    // Check if client has cached version
    const ifNoneMatch = c.req.header("If-None-Match");
    if (ifNoneMatch === etag) {
      return c.status(304); // Not Modified
    }
    
    await next();
  };
};

// Generate ETag based on URL and timestamp
function generateETag(url: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `"${Buffer.from(url + timestamp).toString('base64').substring(0, 8)}"`;
}

// Cache helper functions
export const cacheHelpers = {
  // Set cache headers for different content types
  setCacheHeaders: (c: Context, type: 'static' | 'dynamic' | 'user' | 'none') => {
    switch (type) {
      case 'static':
        c.header("Cache-Control", "public, max-age=31536000, immutable"); // 1 year
        break;
      case 'dynamic':
        c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=60"); // 5 min + 1 min SWR
        break;
      case 'user':
        c.header("Cache-Control", "private, max-age=60, stale-while-revalidate=30"); // 1 min + 30 sec SWR
        break;
      case 'none':
        c.header("Cache-Control", "no-cache, no-store, must-revalidate");
        break;
    }
  },
  
  // Generate cache key for KV storage
  generateCacheKey: (prefix: string, identifier: string): string => {
    return `${prefix}:${identifier}`;
  },
  
  // Set cache headers for profile pages
  setProfileCache: (c: Context, username: string) => {
    c.header("Cache-Control", "public, max-age=30, s-maxage=300, stale-while-revalidate=60");
    c.header("X-Cache-Key", `profile:${username}`);
  },
  
  // Set cache headers for API responses
  setAPICache: (c: Context, maxAge: number = 300) => {
    c.header("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${Math.floor(maxAge / 5)}`);
  },
};
