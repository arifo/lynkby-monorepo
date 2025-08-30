import { Context, Next } from "hono";
import { createError } from "../errors";
import { tokenUtils, type JWTPayload } from "../util/token.utils";

// Extend Hono context with auth data
declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    user: {
      id: string;
      email: string;
      username: string;
    };
  }
}

// Auth context interface for Hono
export interface AuthContext {
  userId: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

// Authentication middleware (required)
export const auth = async (c: Context, next: Next): Promise<void> => {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError.unauthorized("Missing or invalid authorization header");
  }
  
  const token = authHeader.substring(7);
  const env = c.env as { JWT_SECRET: string };
  
  if (!env.JWT_SECRET) {
    throw createError.internalError("JWT secret not configured");
  }
  
  try {
    const decoded = tokenUtils.verifyToken(token, env.JWT_SECRET);
    
    // Set user context in Hono
    c.set("userId", decoded.userId);
    c.set("user", {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username
    });
    
    await next();
  } catch (error) {
    throw createError.unauthorized(
      error instanceof Error ? error.message : "Invalid token"
    );
  }
};

// Optional authentication middleware
export const optionalAuth = async (c: Context, next: Next): Promise<void> => {
  const authHeader = c.req.header("Authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const env = c.env as { JWT_SECRET: string };
    
    if (env.JWT_SECRET) {
      try {
        const decoded = tokenUtils.verifyToken(token, env.JWT_SECRET);
        
        // Set user context in Hono
        c.set("userId", decoded.userId);
        c.set("user", {
          id: decoded.userId,
          email: decoded.email,
          username: decoded.username
        });
      } catch (error) {
        // Silently fail for optional auth
        console.debug("Optional auth failed:", error);
      }
    }
  }
  
  await next();
};

// Export token utilities for use in other parts of the application
export { tokenUtils };
export type { JWTPayload };
