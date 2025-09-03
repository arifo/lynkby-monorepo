import { Context } from "hono";
import { streamSSE } from "hono/streaming";
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
import {
  CreateLoginRequestSchema,
  WaitRequestSchema,
  FinalizeRequestSchema,
  CodeVerificationSchema,
  type CreateLoginRequestInput,
  type WaitRequestInput,
  type FinalizeRequestInput,
  type CodeVerificationInput,
  type LoginRequestResponse,
  type WaitResponse,
  type FinalizeResponse,
  type LoginRequestErrorResponse
} from "@lynkby/shared";
import { pageRepository, userRepository, authRepository, loginRequestRepository } from "../../core/repositories";
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
    loginRequestRepository.setEnvironment(c.env);
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
      
      const { token, requestId } = c.req.query();
      
      // If requestId is provided, this is part of the handoff pattern
      if (requestId) {
        return this.handleHandoffMagicLink(c, token, requestId);
      }
      
      // Otherwise, handle as legacy magic link
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

  // Handle magic link consumption for handoff pattern
  private async handleHandoffMagicLink(c: Context, token: string, requestId: string): Promise<Response> {
    try {
      // Consume the magic link token
      const { user, isNewUser } = await this.authService.consumeMagicLinkToken(token, this.config.jwtSecret);
      
      // Find the login request
      const loginRequest = await loginRequestRepository.findByRequestId(requestId);
      
      if (!loginRequest) {
        throw createError.notFound("Login request not found");
      }
      
      // Check if the email matches
      if (loginRequest.email !== user.email) {
        throw createError.unauthorized("Email mismatch");
      }
      
      // Mark the login request as completed
      await loginRequestRepository.markAsCompleted(requestId, user.id);
      
      // Log successful handoff completion
      logger.logAPI("HANDOFF_MAGIC_LINK_CONSUMED", `user:${user.id}`, { 
        userId: user.id, 
        email: user.email,
        requestId,
        isNewUser
      });
      
      // Return success response (no session creation here - that happens in finalize)
      return c.json({
        ok: true,
        message: "Magic link verified successfully. You can now close this tab and return to the waiting tab.",
        user: {
          id: user.id,
          email: user.email,
          isNewUser
        }
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to process handoff magic link");
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



  // Create login request (handoff pattern)
  async createLoginRequest(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      
      const body = await c.req.json();
      const { email, redirectPath } = CreateLoginRequestSchema.parse(body);
      
      // Get client IP for rate limiting
      const ipAddress = getClientIP(c);
      
      // Check rate limiting
      const rateLimitState = await rateLimitService.checkEmailRateLimit(
        email, 
        ipAddress, 
        c,
        rateLimitConfigs.emailPerAddress,
        rateLimitConfigs.emailPerIP
      );
      
      if (rateLimitState.cooldown > 0) {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Too many requests. Please wait before requesting another link.",
          code: "RATE_LIMITED",
          details: { cooldown: rateLimitState.cooldown }
        };
        return c.json(errorResponse, 429);
      }
      
      // Create login request
      const userAgent = c.req.header("User-Agent");
      const { requestId, code, expiresAt, handshakeNonce } = await loginRequestRepository.createLoginRequest({
        email,
        ipAddress,
        userAgent
      });
      
      // Create magic link with requestId
      const { token, tokenData } = await this.authService.createMagicLinkToken({ 
        email,
        ipAddress,
        userAgent
      }, this.config.jwtSecret);
      
      // Build magic link URL with requestId (using the verify endpoint)
      const verificationUrl = `${this.config.appBase}/auth/verify?token=${encodeURIComponent(token)}&requestId=${encodeURIComponent(requestId)}&redirect=${encodeURIComponent(redirectPath || "/dashboard")}`;
      
      // Send email with both link and code
      await this.authService.sendMagicLinkEmail(email, verificationUrl, code);
      
      // Log the request
      logger.logAPI("LOGIN_REQUEST_CREATED", `email:${email}`, { 
        email, 
        requestId,
        ipAddress,
        tokenId: tokenData.id 
      });
      
      const response: LoginRequestResponse = {
        ok: true,
        requestId,
        expiresAt: expiresAt.toISOString(),
        handshakeNonce,
        message: "Login request created. Check your email for the magic link or use the code."
      };
      
      return c.json(response);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to create login request");
    }
  }

  // Wait for login request completion (SSE/long-poll)
  async waitForLoginRequest(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      const { requestId } = WaitRequestSchema.parse(c.req.query());

      // If the client requests SSE, stream updates until completion/timeout
      const accept = c.req.header("accept") || "";
      const isSSE = accept.includes("text/event-stream");

      if (isSSE) {
        // No-cache for event streams
        c.header("Cache-Control", "no-cache");

        return streamSSE(c, async (stream) => {
          const send = async (event: string, data: unknown) => {
            await stream.writeSSE({ event, data: JSON.stringify(data) });
          };

          const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

          // initial emit
          await send("open", { ok: true, requestId });

          const started = Date.now();
          const maxMs = 5 * 60 * 1000; // 5 minutes
          const intervalMs = 2000; // poll every 2s
          let lastStatus: string | undefined;

          while (Date.now() - started < maxMs) {
            const lr = await loginRequestRepository.findByRequestId(requestId);

            if (!lr) {
              await send("error", { ok: false, code: "REQUEST_NOT_FOUND" });
              break;
            }

            if (lr.expiresAt < new Date()) {
              await loginRequestRepository.markAsExpired(requestId);
              await send("expired", { ok: false, code: "REQUEST_EXPIRED" });
              break;
            }

            if (lr.status !== lastStatus) {
              lastStatus = lr.status;
              await send("status", { ok: true, status: lr.status, userId: lr.userId });
            }

            if (lr.status === "completed") {
              await send("completed", { ok: true, userId: lr.userId });
              break;
            }

            // keep-alive ping
            await stream.writeSSE({ event: "ping", data: Date.now().toString() });
            await sleep(intervalMs);
          }

          await stream.close();
        });
      }

      // Fallback: single JSON status response
      const loginRequest = await loginRequestRepository.findByRequestId(requestId);
      if (!loginRequest) {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Login request not found",
          code: "REQUEST_NOT_FOUND",
        };
        return c.json(errorResponse, 404);
      }
      if (loginRequest.expiresAt < new Date()) {
        await loginRequestRepository.markAsExpired(requestId);
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Login request has expired",
          code: "REQUEST_EXPIRED",
        };
        return c.json(errorResponse, 410);
      }
      const response: WaitResponse = {
        ok: true,
        status: loginRequest.status,
        userId: loginRequest.userId,
        message:
          loginRequest.status === "completed"
            ? "Login request completed successfully"
            : "Login request is still pending",
      };
      return c.json(response);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to check login request status");
    }
  }

  // Finalize login request and create session
  async finalizeLoginRequest(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      
      const body = await c.req.json();
      const { requestId, handshakeNonce } = FinalizeRequestSchema.parse(body);
      
      // Find the login request
      const loginRequest = await loginRequestRepository.findByRequestId(requestId);
      
      if (!loginRequest) {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Login request not found",
          code: "REQUEST_NOT_FOUND"
        };
        return c.json(errorResponse, 404);
      }
      
      // Check if completed
      if (loginRequest.status !== "completed") {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Login request not completed",
          code: "REQUEST_NOT_COMPLETED"
        };
        return c.json(errorResponse, 400);
      }
      
      // Validate handshake nonce
      const isValidNonce = await loginRequestRepository.validateHandshakeNonce(requestId, handshakeNonce);
      if (!isValidNonce) {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Invalid handshake nonce",
          code: "INVALID_NONCE"
        };
        return c.json(errorResponse, 400);
      }
      
      // Get user
      const user = await this.authService.findUserById(loginRequest.userId!);
      if (!user) {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "User not found",
          code: "USER_NOT_FOUND"
        };
        return c.json(errorResponse, 404);
      }
      
      // Create session
      const userAgent = c.req.header("User-Agent");
      const ipAddress = getClientIP(c);
      
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
      
      // Invalidate handshake nonce
      await loginRequestRepository.invalidateHandshakeNonce(requestId);
      
      // Log successful finalization
      logger.logAPI("LOGIN_REQUEST_FINALIZED", `user:${user.id}`, { 
        userId: user.id, 
        email: user.email,
        requestId,
        sessionId: session.id 
      });
      
      const response: FinalizeResponse = {
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
      throw createError.internalError("Failed to finalize login request");
    }
  }

  // Verify code (fallback method)
  async verifyCode(c: Context): Promise<Response> {
    try {
      // Set environment on auth service and repositories
      this.setEnvironment(c);
      
      const body = await c.req.json();
      const { requestId, code } = CodeVerificationSchema.parse(body);
      
      // Find the login request
      const loginRequest = await loginRequestRepository.findByRequestId(requestId);
      
      if (!loginRequest) {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Login request not found",
          code: "REQUEST_NOT_FOUND"
        };
        return c.json(errorResponse, 404);
      }
      
      // Check if expired
      if (loginRequest.expiresAt < new Date()) {
        await loginRequestRepository.markAsExpired(requestId);
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Login request has expired",
          code: "REQUEST_EXPIRED"
        };
        return c.json(errorResponse, 410);
      }
      
      // Verify code
      if (loginRequest.code !== code) {
        const errorResponse: LoginRequestErrorResponse = {
          ok: false,
          error: "Invalid verification code",
          code: "INVALID_CODE"
        };
        return c.json(errorResponse, 400);
      }
      
      // Find or create user
      let user = await this.authService.findUserByEmail(loginRequest.email);
      if (!user) {
        user = await this.authService.createUser(loginRequest.email);
      }
      
      // Mark request as completed
      await loginRequestRepository.markAsCompleted(requestId, user.id);
      
      // Log successful code verification
      logger.logAPI("CODE_VERIFIED", `user:${user.id}`, { 
        userId: user.id, 
        email: user.email,
        requestId
      });
      
      const response: WaitResponse = {
        ok: true,
        status: "completed",
        userId: user.id,
        message: "Code verified successfully"
      };
      
      return c.json(response);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to verify code");
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
