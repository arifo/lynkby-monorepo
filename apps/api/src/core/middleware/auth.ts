import { Context, Next } from "hono";
import { createError } from "../errors";
import { tokenUtils, type JWTPayload } from "../util/token.utils";
import type { AppEnv } from "../env";
import { getCookie } from "hono/cookie";

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

// Authentication middleware (required) - Cookie-based
export const auth = async (c: Context<{ Bindings: AppEnv }>, next: Next): Promise<void> => {
  // Get session token from cookie
  const sessionToken = getCookie(c, "lb_sess");
  
  if (!sessionToken) {
    throw createError.unauthorized("No active session found");
  }
  
  const env = c.env;
  
  if (!env.JWT_SECRET) {
    throw createError.internalError("JWT secret not configured");
  }
  
  try {
    const decoded = tokenUtils.verifyToken(sessionToken, env.JWT_SECRET);
    console.log("decoded", decoded);
    // Set user context in Hono
    c.set("userId", decoded.userId);
    c.set("user", {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username!
    });
    
    await next();
  } catch (error) {
    throw createError.unauthorized(
      error instanceof Error ? error.message : "Invalid or expired session"
    );
  }
};

// Optional authentication middleware - Cookie-based
export const optionalAuth = async (c: Context<{ Bindings: AppEnv }>, next: Next): Promise<void> => {
  // Get session token from cookie
  const sessionToken = getCookie(c, "lb_sess");
  
  if (sessionToken) {
    const env = c.env;
    
    if (env.JWT_SECRET) {
      try {
        const decoded = tokenUtils.verifyToken(sessionToken, env.JWT_SECRET);
        console.log("decoded", decoded);
        // Set user context in Hono
        c.set("userId", decoded.userId);
        c.set("user", {
          id: decoded.userId,
          email: decoded.email,
          username: decoded.username!
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
