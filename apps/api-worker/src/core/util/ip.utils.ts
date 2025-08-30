import { Context } from "hono";

/**
 * Extract client IP address from request headers
 * Prioritizes Cloudflare headers, then falls back to standard headers
 */
export function getClientIP(c: Context): string {
  // Cloudflare headers (most reliable)
  const cfConnectingIP = c.req.header("CF-Connecting-IP");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // X-Forwarded-For header (common in proxy setups)
  const xForwardedFor = c.req.header("X-Forwarded-For");
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const firstIP = xForwardedFor.split(",")[0]?.trim();
    if (firstIP && isValidIP(firstIP)) {
      return firstIP;
    }
  }

  // X-Real-IP header (used by some reverse proxies)
  const xRealIP = c.req.header("X-Real-IP");
  if (xRealIP && isValidIP(xRealIP)) {
    return xRealIP;
  }

  // X-Client-IP header
  const xClientIP = c.req.header("X-Client-IP");
  if (xClientIP && isValidIP(xClientIP)) {
    return xClientIP;
  }

  // Fallback to a default IP if none found
  // In production, you might want to throw an error instead
  return "unknown";
}

/**
 * Validate if a string is a valid IP address
 */
function isValidIP(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // Basic IPv6 validation (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check if an IP address is in a private range
 */
export function isPrivateIP(ip: string): boolean {
  // Private IP ranges
  const privateRanges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^::1$/,                    // IPv6 localhost
    /^fe80:/,                   // IPv6 link-local
    /^fc00:/,                   // IPv6 unique local
    /^fd00:/,                   // IPv6 unique local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Get IP address with privacy considerations
 * Returns a hashed version for private IPs to protect user privacy
 */
export function getPrivacySafeIP(c: Context): string {
  const ip = getClientIP(c);
  
  if (isPrivateIP(ip) || ip === "unknown") {
    // Hash private/unknown IPs for privacy
    return `private_${hashString(ip)}`;
  }
  
  return ip;
}

/**
 * Simple string hashing function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
