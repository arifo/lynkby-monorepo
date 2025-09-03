import { Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  RequestMagicLinkSchema, 
  ConsumeMagicLinkSchema, 
  MagicLinkResponse,
  SessionResponse,
  AuthErrorResponse
} from "./auth.schemas";
import { pageRepository, userRepository, authRepository } from "../../core/repositories";
import { databaseService } from "../../core/services/database.service";
import { emailService } from "../../core/services/email.service";
import { getClientIP } from "../../core/util/ip.utils";
import { rateLimitService, rateLimitConfigs } from "../../core/services/rate-limit.service";
import type { IAuthService, IAuthController, AuthModuleConfig } from "./auth.interfaces";

export class AuthController implements IAuthController {
  private readonly authService: IAuthService;
  private readonly config: AuthModuleConfig;

  constructor(
    authService: IAuthService,
    config: AuthModuleConfig
  ) {
    this.authService = authService;
    this.config = config;
  }
  
  // Set environment on auth service and repositories
  private setEnvironment(c: Context): void {
    this.authService.setEnvironment(c.env);
    rateLimitService.setEnvironment(c.env);
    pageRepository.setEnvironment(c.env);
    userRepository.setEnvironment(c.env);
    authRepository.setEnvironment(c.env);
    databaseService.setEnvironment(c.env);
    emailService.setEnvironment(c.env);
  }
  
  // Request magic link
  async requestMagicLink(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
     
      const body = await c.req.json();
      const { email, redirectPath: redirectPathParam } = RequestMagicLinkSchema.parse(body);
      
      // Get client IP for rate limiting
      const ipAddress = getClientIP(c);
      
      // Check rate limiting using the centralized service
      const rateLimitState = await rateLimitService.checkEmailRateLimit(
        email, 
        ipAddress, 
        c,
        rateLimitConfigs.emailPerAddress,
        rateLimitConfigs.emailPerIP
      );
      
      if (rateLimitState.cooldown > 0) {
        const errorResponse: AuthErrorResponse = {
          ok: false,
          error: "Too many requests. Please wait before requesting another link.",
          code: "RATE_LIMITED",
          cooldown: rateLimitState.cooldown,
        };
        return c.json(errorResponse, 429);
      }
      
      // Create magic link token
      const userAgent = c.req.header("User-Agent");
      const { token, tokenData , redirectPath} = await this.authService.createMagicLinkToken({ 
        email,
        ipAddress,
        userAgent
      }, this.config.jwtSecret);
  
      // Build magic link URL that lands on the app's callback page
      const verificationUrl = `${this.config.appBase}/auth/callback?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPathParam || redirectPath)}`;
      await this.authService.sendMagicLinkEmail(email, verificationUrl);
      
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
      console.log("AuthController requestMagicLink error", error);
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to request magic link");
    }
  }

  // Consume magic link and create session
  async consumeMagicLink(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      
      const { token } = ConsumeMagicLinkSchema.parse(c.req.query());
      
      // Consume the magic link token
      const { user, isNewUser } = await this.authService.consumeMagicLinkToken(token, this.config.jwtSecret);

      // Create user session
      const userAgent = c.req.header("User-Agent");
      const ipAddress = getClientIP(c);
      
      // Using cookie-based auth; no Authorization header needed.
      // Create user session
      const { session, plaintextToken } = await this.authService.createSession({
        userId: user.id,
        userAgent,
        ipAddress,
      }, this.config.jwtSecret);

      // Set secure session cookie
      const cookieOptions = {
        httpOnly: true,
        secure: this.config.nodeEnv === "production",
        sameSite: "Lax" as const,
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        domain: this.config.nodeEnv === "production" ? ".lynkby.com" : undefined,
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



  // Get current user session
  async getCurrentUser(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      
      // Get session token from cookie
      const sessionToken = getCookie(c, "session_token");
      
      if (!sessionToken) {
        throw createError.unauthorized("No active session found");
      }
      
      // Validate session
      const sessionData = await this.authService.validateSession(sessionToken, this.config.jwtSecret);
      if (!sessionData) {
        throw createError.unauthorized("Invalid or expired session");
      }
      
      const { user, session } = sessionData;

      // Refresh cookie to maintain sliding expiration
      const cookieOptions = {
        httpOnly: true,
        secure: this.config.nodeEnv === "production",
        sameSite: "Lax" as const,
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        domain: this.config.nodeEnv === "production" ? ".lynkby.com" : undefined,
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
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      // Get session token from cookie
      const sessionToken = getCookie(c, "session_token");
      
      if (sessionToken) {
        // Delete session from database
        await this.authService.deleteSessionByToken(sessionToken);
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



  // Health check for auth service
  async healthCheck(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
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

// Note: AuthController is now instantiated through the AuthContainer
// Use getAuthContainer().getAuthController() to get an instance
