import { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { csrfService } from "../services/csrf.service";
import { createError } from "../errors";
import { logger } from "../util/logger";

/**
 * CSRF middleware for protecting routes
 */
export const csrf = async (c: Context, next: Next): Promise<void> => {
  const method = c.req.method;
  
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await next();
    return;
  }
  
  try {
    // Set environment on CSRF service
    csrfService.setEnvironment(c.env);
    
    // Get CSRF token from header
    const csrfToken = c.req.header('X-CSRF-Token');
    
    if (!csrfToken) {
      logger.warn('CSRF token missing', { 
        path: c.req.path,
        method,
        ip: c.req.header('CF-Connecting-IP') || 'unknown'
      });
      throw createError.forbidden("CSRF token required");
    }
    
    // Validate CSRF token
    const isValid = await csrfService.validateToken(csrfToken);
    
    if (!isValid) {
      logger.warn('Invalid CSRF token', { 
        path: c.req.path,
        method,
        ip: c.req.header('CF-Connecting-IP') || 'unknown',
        tokenId: csrfToken.substring(0, 8) + '...'
      });
      throw createError.forbidden("Invalid CSRF token");
    }
    
    logger.debug('CSRF token validated', { 
      path: c.req.path,
      method,
      tokenId: csrfToken.substring(0, 8) + '...'
    });
    
    await next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('CSRF')) {
      throw error;
    }
    
    logger.error('CSRF validation failed', { 
      error,
      path: c.req.path,
      method
    });
    throw createError.internalError("CSRF validation failed");
  }
};

/**
 * CSRF token generation middleware
 * Sets a CSRF token cookie for the client
 */
export const csrfToken = async (c: Context, next: Next): Promise<void> => {
  try {
    // Set environment on CSRF service
    csrfService.setEnvironment(c.env);
    
    // Generate new CSRF token
    const { token } = await csrfService.generateToken();
    
    // Set CSRF token cookie (non-httpOnly for client access)
    setCookie(c, 'lb_csrf', token, {
      httpOnly: false, // Allow client-side access
      secure: c.req.header('x-forwarded-proto') === 'https',
      sameSite: 'Lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });
    
    logger.debug('CSRF token cookie set', { 
      path: c.req.path,
      tokenId: token.substring(0, 8) + '...'
    });
    
    await next();
  } catch (error) {
    logger.error('Failed to generate CSRF token', { 
      error,
      path: c.req.path
    });
    throw createError.internalError("Failed to generate CSRF token");
  }
};
