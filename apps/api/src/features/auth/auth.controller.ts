import { Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  SessionResponse,
  AuthErrorResponse
} from "./auth.schemas";
import { authRepository } from "../../core/repositories";
import { databaseService } from "../../core/services/database.service";
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
    authRepository.setEnvironment(c.env);
    databaseService.setEnvironment(c.env);
  }
  
  // Get current user session
  async getCurrentUser(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      
      // Get session token from cookie
      const sessionToken = getCookie(c, "lb_sess");
      
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
      setCookie(c, "lb_sess", sessionToken, cookieOptions);
      
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
      const sessionToken = getCookie(c, "lb_sess");
      
      if (sessionToken) {
        // Delete session from database
        await this.authService.deleteSessionByToken(sessionToken);
      }
      
      // Clear session cookie
      deleteCookie(c, "lb_sess", { path: "/", domain: c.env.NODE_ENV === "production" ? ".lynkby.com" : undefined });
      
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