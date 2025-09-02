import { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { authService } from "./auth.service";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  RequestMagicLinkSchema, 
  ConsumeMagicLinkSchema, 
  SetupUsernameSchema,
  MagicLinkResponse,
  SessionResponse,
  AuthErrorResponse
} from "./auth.schemas";
import { RATE_LIMIT_CONFIG } from "./auth.schemas";
import { pageRepository } from "../../core/repositories/page.repository";
import { getClientIP } from "../../core/util/ip.utils";

export class AuthController {
  
  // Request magic link
  async requestMagicLink(c: Context): Promise<Response> {
    try {
      const body = await c.req.json();
      const { email, redirectPath } = RequestMagicLinkSchema.parse(body);
      
      // Get client IP for rate limiting
      const ipAddress = getClientIP(c);
      
      // Per-email and per-IP rate limiting backed by KV (1h window)
      const now = Date.now();
      const emailKey = `rl:magic:email:${email.toLowerCase()}`;
      const ipKey = `rl:magic:ip:${ipAddress}`;
      const emailLimit = RATE_LIMIT_CONFIG.EMAIL_PER_ADDRESS;
      const ipLimit = RATE_LIMIT_CONFIG.EMAIL_PER_IP;

      const readCounter = async (key: string, windowMs: number) => {
        // Check if KV_CACHE is available
        if (!c.env.KV_CACHE) {
          console.warn("KV_CACHE not available, skipping rate limiting");
          return { count: 0, expiresAt: 0 };
        }
        
        try {
          const val = await c.env.KV_CACHE.get(key);
          if (!val) return { count: 0, expiresAt: 0 };
          try {
            const obj = JSON.parse(val) as { count: number; expiresAt: number };
            return obj;
          } catch {
            return { count: 0, expiresAt: 0 };
          }
        } catch (error) {
          console.warn("Failed to read from KV_CACHE:", error);
          return { count: 0, expiresAt: 0 };
        }
      };

      const writeCounter = async (key: string, count: number, expiresAt: number) => {
        // Check if KV_CACHE is available
        if (!c.env.KV_CACHE) {
          console.warn("KV_CACHE not available, skipping rate limiting write");
          return;
        }
        
        try {
          const ttl = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
          await c.env.KV_CACHE.put(key, JSON.stringify({ count, expiresAt }), { expirationTtl: ttl });
        } catch (error) {
          console.warn("Failed to write to KV_CACHE:", error);
        }
      };

      const bump = async (key: string, limit: { maxRequests: number; windowMs: number }) => {
        // If KV_CACHE is not available, skip rate limiting
        if (!c.env.KV_CACHE) {
          console.warn("KV_CACHE not available, allowing request without rate limiting");
          return { limited: false, cooldown: 0 } as const;
        }
        
        const state = await readCounter(key, limit.windowMs);
        const windowStart = state.expiresAt > now ? state.expiresAt - limit.windowMs : now;
        const expiresAt = state.expiresAt > now ? state.expiresAt : now + limit.windowMs;
        const nextCount = state.expiresAt > now ? state.count + 1 : 1;
        if (nextCount > limit.maxRequests) {
          return { limited: true, cooldown: Math.ceil((expiresAt - now) / 1000) } as const;
        }
        await writeCounter(key, nextCount, expiresAt);
        return { limited: false, cooldown: 0 } as const;
      };

      // Apply limits
      const emailRL = await bump(emailKey, emailLimit);
      const ipRL = await bump(ipKey, ipLimit);
      if (emailRL.limited || ipRL.limited) {
        const cooldown = Math.max(emailRL.cooldown, ipRL.cooldown);
        const errorResponse: AuthErrorResponse = {
          ok: false,
          error: "Too many requests. Please wait before requesting another link.",
          code: "RATE_LIMITED",
          cooldown,
        };
        return c.json(errorResponse, 429);
      }
      
      // Create magic link token
      const userAgent = c.req.header("User-Agent");
      const { token, tokenData } = await authService.createMagicLinkToken({ 
        email,
        ipAddress,
        userAgent,
        redirectPath,
      }, c.env.JWT_SECRET);
      
      // Build magic link URL that lands on the app's callback page
      const appBase = c.env.NODE_ENV === "production" ? "https://app.lynkby.com" : "http://localhost:3001";
      const verificationUrl = `${appBase}/auth/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath || "/dashboard")}`;
      const RESEND_API_KEY = c.env.RESEND_API_KEY 
      // Send magic link email (Resend if configured)
      await authService.sendMagicLinkEmail(email, verificationUrl, {
        provider: RESEND_API_KEY ? 'resend' : undefined,
        apiKey: RESEND_API_KEY,
        from: c.env.SMTP_FROM,
        supportEmail: c.env.SMTP_USER,
        appName: c.env.APP_NAME || 'Lynkby',
      });
      
      // Log the request
      logger.logAPI("MAGIC_LINK_REQUESTED", `email:${email}`, { 
        email, 
        ipAddress,
        tokenId: tokenData.id 
      });
      
      const response: MagicLinkResponse = {
        ok: true,
        message: "If this email is registered, you'll receive a magic link shortly.",
        // Recommend UI cooldown between attempts
        cooldown: 60,
      };
      
      return c.json(response);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to request magic link");
    }
  }

  // Consume magic link and create session
  async consumeMagicLink(c: Context): Promise<Response> {
    try {
      const { token } = ConsumeMagicLinkSchema.parse(c.req.query());
      
      // Consume the magic link token
      const { user, isNewUser } = await authService.consumeMagicLinkToken(token, c.env.JWT_SECRET);
      
      // Create user session
      const userAgent = c.req.header("User-Agent");
      const ipAddress = getClientIP(c);
      
      // Create user session
      const { session, plaintextToken } = await authService.createSession({
        userId: user.id,
        userAgent,
        ipAddress,
      }, c.env.JWT_SECRET);
      
      // Set secure session cookie
      const cookieOptions = {
        httpOnly: true,
        secure: c.env.NODE_ENV === "production",
        sameSite: "Lax" as const,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        domain: c.env.NODE_ENV === "production" ? ".lynkby.com" : undefined,
      } as const;
      
      setCookie(c, "session_token", plaintextToken, cookieOptions);
      
      // Log successful consumption
      logger.logAPI("MAGIC_LINK_CONSUMED", `user:${user.id}`, { 
        userId: user.id, 
        email: user.email, 
        isNewUser,
        ipAddress 
      });
      
      const response: SessionResponse = {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isNewUser,
        },
        session: {
          expiresAt: session.expiresAt.toISOString(),
          maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        },
      };
      // Optional redirect back to app
      const redirect = c.req.query("redirect");
      if (redirect && /^https?:\/\//.test(redirect)) {
        const allowed = [
          "https://app.lynkby.com",
          "https://app-dev.lynkby.com",
          "http://localhost:3000",
        ];
        if (allowed.some(a => redirect.startsWith(a))) {
          return c.redirect(redirect, 302);
        }
      }
      return c.json(response);
      
    } catch (error) {
      // Map common token errors to friendly responses for UI
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const appError = error as any;
        const msg = (appError.message || "").toLowerCase();
        const base = { ok: false as const };
        if (msg.includes("expired")) {
          return c.json({ ...base, error: "Magic link expired", code: "MAGIC_LINK_EXPIRED", cooldown: 0, details: { canResend: true } }, 401);
        }
        if (msg.includes("already been used") || msg.includes("already used") || msg.includes("used")) {
          return c.json({ ...base, error: "Magic link already used", code: "MAGIC_LINK_USED", cooldown: 0, details: { canResend: true } }, 401);
        }
        if (msg.includes("invalid")) {
          return c.json({ ...base, error: "Invalid magic link", code: "MAGIC_LINK_INVALID", cooldown: 0, details: { canResend: true } }, 401);
        }
        // Fallback to error handler
        throw error;
      }
      throw error;
    }
  }

  // Setup username for first-time users
  async setupUsername(c: Context): Promise<Response> {
    try {
      const body = await c.req.json();
      const { username } = SetupUsernameSchema.parse(body);
      
      // Get user from session cookie
      const sessionToken = c.req.header("Cookie")?.match(/session_token=([^;]+)/)?.[1];
      
      if (!sessionToken) {
        throw createError.unauthorized("No active session found");
      }
      
      // Validate session
      const sessionData = await authService.validateSession(sessionToken, c.env.JWT_SECRET);
      if (!sessionData) {
        throw createError.unauthorized("Invalid or expired session");
      }
      
      const { user } = sessionData;
      
      // Check if user already has a username
      if (user.username) {
        throw createError.conflict("User already has a username");
      }
      
      // Normalize to lowercase slug for storage
      const normalizedUsername = username.toLowerCase();
      // Update username
      const updatedUser = await authService.updateUsername(user.id, normalizedUsername);
      // Auto-create page if missing
      try {
        const existing = await pageRepository.findByUserId(updatedUser.id);
        if (!existing) {
          const emailLocal = (updatedUser.email || "").split("@")[0] || normalizedUsername;
          const displayName = emailLocal
            .replace(/[._-]+/g, " ")
            .split(" ")
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ") || normalizedUsername;
          await pageRepository.create({ userId: updatedUser.id, displayName });
          logger.info("Auto-created page for user (legacy setup)", { userId: updatedUser.id, username: normalizedUsername });
        }
      } catch (err) {
        logger.warn("Failed to auto-create page (legacy setup)", { userId: updatedUser.id, error: err instanceof Error ? err.message : String(err) });
      }
      // Refresh cookie after profile update to maintain sliding expiry
      const cookieOptions = {
        httpOnly: true,
        secure: c.env.NODE_ENV === "production",
        sameSite: "Lax" as const,
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        domain: c.env.NODE_ENV === "production" ? ".lynkby.com" : undefined,
      } as const;
      setCookie(c, "session_token", sessionToken, cookieOptions);
      
      // Log username setup
      logger.logAPI("USERNAME_SETUP", `user:${user.id}`, { 
        userId: user.id, 
        username,
        email: user.email 
      });
      
      return c.json({
        ok: true,
        message: "Username set successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          isNewUser: false,
        },
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to setup username");
    }
  }

  // Get current user session
  async getCurrentUser(c: Context): Promise<Response> {
    try {
      // Get session token from cookie
      const sessionToken = c.req.header("Cookie")?.match(/session_token=([^;]+)/)?.[1];
      
      if (!sessionToken) {
        throw createError.unauthorized("No active session found");
      }
      
      // Validate session
      const sessionData = await authService.validateSession(sessionToken, c.env.JWT_SECRET);
      if (!sessionData) {
        throw createError.unauthorized("Invalid or expired session");
      }
      
      const { user, session } = sessionData;

      // Refresh cookie to maintain sliding expiration
      const cookieOptions = {
        httpOnly: true,
        secure: c.env.NODE_ENV === "production",
        sameSite: "Lax" as const,
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        domain: c.env.NODE_ENV === "production" ? ".lynkby.com" : undefined,
      } as const;
      setCookie(c, "session_token", sessionToken, cookieOptions);
      
      // Log session validation
      logger.logAPI("SESSION_VALIDATED", `user:${user.id}`, { 
        userId: user.id, 
        email: user.email,
        sessionId: session.id 
      });
      
      const response: SessionResponse = {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isNewUser: !user.username,
        },
        session: {
          expiresAt: session.expiresAt.toISOString(),
          maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        },
      };
      
      return c.json(response);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to get current user");
    }
  }

  // Logout user
  async logout(c: Context): Promise<Response> {
    try {
      // Get session token from cookie
      const sessionToken = c.req.header("Cookie")?.match(/session_token=([^;]+)/)?.[1];
      
      if (sessionToken) {
        // Delete session from database
        await authService.deleteSessionByToken(sessionToken);
      }
      
      // Clear session cookie
      deleteCookie(c, "session_token", { path: "/", domain: c.env.NODE_ENV === "production" ? ".lynkby.com" : undefined });
      
      // Log logout
      logger.logAPI("USER_LOGOUT", "session", { 
        sessionToken: sessionToken ? sessionToken.substring(0, 8) + "..." : "none" 
      });
      
      return c.json({
        ok: true,
        message: "Logged out successfully",
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to logout");
    }
  }

  // Check if username is available
  async checkUsernameAvailability(c: Context): Promise<Response> {
    try {
      const { username } = c.req.query();
      
      if (!username) {
        throw createError.validationError("Username is required");
      }
      
      // Validate username format
      const validation = SetupUsernameSchema.safeParse({ username });
      if (!validation.success) {
        return c.json({
          ok: false,
          available: false,
          reason: validation.error.errors[0]?.message || "Invalid username format",
        });
      }
      
      // Check if username is taken
      const existingUser = await authService.findUserByUsername(username);
      const isAvailable = !existingUser;
      
      return c.json({
        ok: true,
        available: isAvailable,
        reason: isAvailable ? undefined : "Username is already taken",
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to check username availability");
    }
  }

  // Health check for auth service
  async healthCheck(c: Context): Promise<Response> {
    try {
      // Basic health check
      return c.json({
        ok: true,
        service: "auth",
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      logger.error("Auth health check failed", { error });
      
      return c.json({
        ok: false,
        service: "auth",
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
}

// Export singleton instance
export const authController = new AuthController();
