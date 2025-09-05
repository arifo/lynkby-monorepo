import { Context } from "hono";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  CheckUsernameRequestSchema,
  ClaimUsernameRequestSchema,
  UsernameAvailabilityResponse,
  UsernameClaimResponse,
  SetupErrorResponse
} from "./setup.schemas";
import { userRepository, authRepository } from "../../core/repositories";
import { tokenUtils } from "../../core/util/token.utils";
import type { ISetupService, ISetupController, SetupModuleConfig } from "./setup.interfaces";

export class SetupController implements ISetupController {
  private readonly setupService: ISetupService;
  private readonly config: SetupModuleConfig;

  constructor(
    setupService: ISetupService,
    config: SetupModuleConfig
  ) {
    this.setupService = setupService;
    this.config = config;
  }
  
  // Set environment on setup service and repositories
  private setEnvironment(c: Context): void {
    this.setupService.setEnvironment(c.env);
    userRepository.setEnvironment(c.env);
    authRepository.setEnvironment(c.env);
  }

  // Get user from session token
  private async getUserFromSession(c: Context): Promise<{ userId: string; email: string }> {
    const sessionToken = c.req.header("Cookie")?.match(/lb_sess=([^;]+)/)?.[1];
    
    if (!sessionToken) {
      throw createError.unauthorized("No active session found");
    }
    
    try {
      // Verify JWT token
      const payload = tokenUtils.verifyToken(sessionToken, this.config.jwtSecret);
      
      // Find session by hash
      const tokenHash = tokenUtils.hashToken(sessionToken);
      const sessionData = await authRepository.findSessionByHash(tokenHash);
      
      if (!sessionData || sessionData.expiresAt < new Date() || sessionData.revokedAt) {
        throw createError.unauthorized("Invalid or expired session");
      }

      // Get user
      const user = await userRepository.findById(sessionData.userId);
      if (!user) {
        throw createError.unauthorized("User not found");
      }

      return {
        userId: user.id,
        email: user.email
      };
    } catch (error) {
      throw createError.unauthorized("Invalid or expired session");
    }
  }
  
  // Check username availability
  async checkUsername(c: Context): Promise<Response> {
    try {
      // Set environment on setup service and repositories
      this.setEnvironment(c);
      
      const { username } = CheckUsernameRequestSchema.parse(c.req.query());
      
      // Check username availability
      const result = await this.setupService.checkUsernameAvailability(username);
      
      // Log the check
      logger.logAPI("USERNAME_CHECK", `username:${username}`, { 
        username,
        available: result.isAvailable,
        reason: result.reason
      });
      
      const response: UsernameAvailabilityResponse = {
        ok: true,
        available: result.isAvailable,
        reason: result.reason,
      };
      
      return c.json(response);
      
    } catch (error) {
      logger.error("SetupController checkUsername error", { error });
      
      if (error instanceof Error && error.message.includes('validation')) {
        const errorResponse: SetupErrorResponse = {
          ok: false,
          error: error.message,
          code: "VALIDATION_ERROR",
        };
        return c.json(errorResponse, 400);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to check username availability");
    }
  }

  // Claim username
  async claimUsername(c: Context): Promise<Response> {
    try {
      // Set environment on setup service and repositories
      this.setEnvironment(c);
      
      const body = await c.req.json();
      const { username } = ClaimUsernameRequestSchema.parse(body);
      
      // Get user from session
      const { userId, email } = await this.getUserFromSession(c);
      
      // Check if user already has a username
      const currentUser = await userRepository.findById(userId);
      if (currentUser?.username) {
        // If user already has the same username, return success
        if (currentUser.username.toLowerCase() === username.toLowerCase()) {
          const response: UsernameClaimResponse = {
            ok: true,
            message: "Username already claimed",
            user: {
              id: currentUser.id,
              email: currentUser.email,
              username: currentUser.username,
            },
          };
          return c.json(response);
        }
        // If user has a different username, return conflict
        throw createError.conflict("User already has a different username");
      }
      
      // Claim the username
      const result = await this.setupService.claimUsername(userId, username);
      
      if (!result.success) {
        const errorResponse: SetupErrorResponse = {
          ok: false,
          error: result.error || "Failed to claim username",
          code: "CLAIM_FAILED",
        };
        return c.json(errorResponse, 400);
      }
      
      // Log the claim
      logger.logAPI("USERNAME_CLAIMED", `user:${userId}`, { 
        userId,
        email,
        username: username.toLowerCase()
      });
      
      const response: UsernameClaimResponse = {
        ok: true,
        message: "Username claimed successfully",
        user: result.user,
      };
      
      return c.json(response);
      
    } catch (error) {
      logger.error("SetupController claimUsername error", { error });
      
      if (error instanceof Error && error.message.includes('validation')) {
        const errorResponse: SetupErrorResponse = {
          ok: false,
          error: error.message,
          code: "VALIDATION_ERROR",
        };
        return c.json(errorResponse, 400);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to claim username");
    }
  }

  // Create default page (idempotent)
  async setupDefaultPage(c: Context): Promise<Response> {
    try {
      this.setEnvironment(c);
      // Must be authenticated
      const { userId } = await this.getUserFromSession(c);

      const result = await this.setupService.createDefaultPageIfMissing(userId);
      const liveUrl = result.username ? `https://${result.username}.lynkby.com` : undefined;
      const fallbackUrl = result.username ? `https://lynkby.com/u/${result.username}` : undefined;

      return c.json({
        pageId: result.pageId,
        username: result.username,
        liveUrl,
        fallbackUrl,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to setup default page");
    }
  }

  async markFirstSaveCompleted(c: Context): Promise<Response> {
    this.setEnvironment(c);
    const userId = c.get("userId");
    const result = await this.setupService.markFirstSaveCompleted(userId);
    if (!result.ok) {
      if (result.error) {
        return c.json({ ok: false, error: result.error }, 400);
      }
      return c.json({ ok: false, error: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true });
  }

  async updateChecklistItem(c: Context): Promise<Response> {
    this.setEnvironment(c);
    const userId = c.get("userId");
    const body = await c.req.json();
    const { key, done } = body ?? {};
    
    if (!key || typeof done !== 'boolean') {
      return c.json({ ok: false, error: "Invalid request body" }, 400);
    }

    const result = await this.setupService.updateChecklistItem(userId, key, done);
    if (!result.ok) {
      if (result.error) {
        return c.json({ ok: false, error: result.error }, 400);
      }
      return c.json({ ok: false, error: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true, checklist: result.checklist });
  }

  // Health check for setup service
  async healthCheck(c: Context): Promise<Response> {
    try {
      // Set environment on setup service and repositories
      this.setEnvironment(c);
      
      // Basic health check
      return c.json({
        ok: true,
        service: "setup",
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      logger.error("Setup health check failed", { error });
      
      return c.json({
        ok: false,
        service: "setup",
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
}
