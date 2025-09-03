import { Context } from "hono";
import { getClientIP as getClientIPFromHeaders, getPrivacySafeIP as getPrivacySafeIPFromHeaders } from '@lynkby/shared';

/**
 * Extract client IP address from Hono context
 * Wrapper around shared utility for Hono-specific usage
 */
export function getClientIP(c: Context): string {
  const headers: Record<string, string | undefined> = {};
  
  // Extract headers from Hono context
  const headerNames = ['CF-Connecting-IP', 'X-Forwarded-For', 'X-Real-IP', 'X-Client-IP'];
  headerNames.forEach(name => {
    const value = c.req.header(name);
    if (value) {
      headers[name] = value;
    }
  });
  
  return getClientIPFromHeaders(headers);
}

/**
 * Get IP address with privacy considerations from Hono context
 * Wrapper around shared utility for Hono-specific usage
 */
export function getPrivacySafeIP(c: Context): string {
  const headers: Record<string, string | undefined> = {};
  
  // Extract headers from Hono context
  const headerNames = ['CF-Connecting-IP', 'X-Forwarded-For', 'X-Real-IP', 'X-Client-IP'];
  headerNames.forEach(name => {
    const value = c.req.header(name);
    if (value) {
      headers[name] = value;
    }
  });
  
  return getPrivacySafeIPFromHeaders(headers);
}
