import { userRepository, authRepository, type User, type UserSession as RepoUserSession } from "../../core/repositories";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  UserSession, 
  AuthUser, 
  SessionOptions,
  EmailValidationResult,
  AuthEvent,
  DISPOSABLE_EMAIL_DOMAINS,
} from '@lynkby/shared';
import { rateLimitService, rateLimitConfigs } from "../../core/services/rate-limit.service";
import { tokenUtils } from "../../core/util/token.utils";
import { BaseService } from "../../core/services/base.service";
import type { IAuthService } from "./auth.interfaces";

export class AuthService extends BaseService implements IAuthService {
  
  // Helper method to convert User to AuthUser
  private userToAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt || undefined,
      isVerified: true, // All users created through auth are considered verified
    };
  }

  // Helper method to convert RepoUserSession to UserSession
  private repoSessionToAuthSession(session: RepoUserSession): UserSession {
    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      revokedAt: session.revokedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    };
  }

  // Log authentication events
  private logAuthEvent(event: Omit<AuthEvent, 'timestamp'>): void {
    const authEvent: AuthEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    logger.info(`AUTH_EVENT: ${event.type}`, {
      event: authEvent,
      userId: event.userId,
      email: event.email,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
    });
  }

  // Validate email format and check for disposable domains
  async validateEmail(email: string): Promise<EmailValidationResult> {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      return { isValid: false, isDisposable: false, reason: "Invalid email format" };
    }

    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return { isValid: true, isDisposable: true, reason: "Disposable email domains are not allowed" };
    }

    return { isValid: true, isDisposable: false };
  }

  // Check rate limiting for email requests using centralized service
  async checkRateLimit(email: string, ipAddress: string, context: any): Promise<any> {
    return await rateLimitService.checkEmailRateLimit(
      email, 
      ipAddress, 
      context,
      rateLimitConfigs.emailPerAddress,
      rateLimitConfigs.emailPerIP
    );
  }

  // Find user by email
  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await userRepository.findByEmail(email.toLowerCase());
    return user ? this.userToAuthUser(user) : null;
  }

  // Create new user
  async createUser(email: string): Promise<AuthUser> {
    const user = await userRepository.createUserForAuth(email.toLowerCase());
    return this.userToAuthUser(user);
  }

  // Update user's last login time
  private async updateLastLogin(userId: string): Promise<void> {
    await userRepository.updateLastLogin(userId);
  }

  // Create user session
  async createSession(options: SessionOptions, secret: string): Promise<{ session: UserSession; plaintextToken: string }> {
    const { userId, userAgent, ipAddress, maxAgeDays = 30 } = options;
    
    // Generate JWT session token
    const user = await this.findUserById(userId);
    if (!user) {
      throw createError.notFound("User not found");
    }

    const sessionToken = tokenUtils.generateSessionToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    }, secret, `${maxAgeDays}d`);

    // Hash the token for secure storage
    const tokenHash = tokenUtils.hashToken(sessionToken);
    
    const expiresAt = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000);
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: UserSession = {
      id,
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      ipAddress,
      userAgent,
    };

    // Save session to database
    await this.saveSession(session);

    // Log session creation
    this.logAuthEvent({
      type: 'session_created',
      userId,
      ipAddress,
      userAgent,
      details: { sessionId: id, expiresAt },
    });

    logger.info("User session created", { userId, sessionId: id, expiresAt });
    
    return { session, plaintextToken: sessionToken };
  }

  // Save session to database
  private async saveSession(session: UserSession): Promise<void> {
    await authRepository.saveUserSession({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    });
  }

  // Validate session token
  async validateSession(sessionToken: string, secret: string): Promise<{ user: AuthUser; session: UserSession } | null> {
    try {
      // Verify the JWT token
      const payload = tokenUtils.verifyToken(sessionToken, secret);
      
      // Find session by hash
      const tokenHash = tokenUtils.hashToken(sessionToken);
      const session = await this.findSessionByHash(tokenHash);
      
      if (!session) {
        return null;
      }

      if (session.expiresAt < new Date()) {
        // Session expired, clean it up
        await this.deleteSession(session.id);
        return null;
      }

      if (session.revokedAt) {
        // Session revoked, clean it up
        await this.deleteSession(session.id);
        return null;
      }

      // Update last used time and extend expiration (sliding window)
      await this.updateSessionUsage(session.id, 30);
      // Reflect new expiration in returned object
      session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Get user
      const user = await this.findUserById(session.userId);
      if (!user) {
        // User doesn't exist, clean up session
        await this.deleteSession(session.id);
        return null;
      }

      // Log user login
      this.logAuthEvent({
        type: 'user_login',
        userId: user.id,
        email: user.email,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        details: { sessionId: session.id },
      });

      return { user, session };
    } catch (error) {
      // JWT verification failed
      return null;
    }
  }

  // Find session by hash
  private async findSessionByHash(tokenHash: string): Promise<UserSession | null> {
    const session = await authRepository.findSessionByHash(tokenHash);
    return session ? this.repoSessionToAuthSession(session) : null;
  }

  // Find user by ID
  async findUserById(userId: string): Promise<AuthUser | null> {
    const user = await userRepository.findById(userId);
    return user ? this.userToAuthUser(user) : null;
  }

  // Update session last used time and extend expiration by given days
  private async updateSessionUsage(sessionId: string, extendDays: number): Promise<void> {
    const now = new Date();
    const newExpiresAt = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);
    await authRepository.updateSessionUsage(sessionId, now, newExpiresAt);
  }

  // Delete session
  private async deleteSession(sessionId: string): Promise<void> {
    await authRepository.deleteSession(sessionId);
  }

  // Delete session by token (for logout)
  async deleteSessionByToken(token: string): Promise<void> {
    const tokenHash = tokenUtils.hashToken(token);
    const session = await this.findSessionByHash(tokenHash);
    
    if (session) {
      // Mark session as revoked instead of deleting
      await this.revokeSession(session.id);
      
      // Log session revocation
      this.logAuthEvent({
        type: 'session_revoked',
        userId: session.userId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        details: { sessionId: session.id, reason: 'logout' },
      });
    }
    
    logger.info("User session deleted", { token: token.substring(0, 8) + "..." });
  }

  // Revoke session (mark as revoked instead of deleting)
  private async revokeSession(sessionId: string): Promise<void> {
    await authRepository.revokeSession(sessionId);
  }

  // Clean up expired tokens and sessions
  async cleanupExpired(): Promise<void> {
    // Clean up expired sessions
    await authRepository.deleteExpiredSessions();
    
    logger.info("Expired sessions cleaned up");
  }

  // Revoke all sessions for a user (for future email change functionality)
  async revokeAllUserSessions(userId: string, reason: string = 'security'): Promise<void> {
    await authRepository.revokeAllUserSessions(userId);
    
    // Log the event
    this.logAuthEvent({
      type: 'session_revoked',
      userId,
      details: { reason, count: 'all' },
    });
    
    logger.info("All user sessions revoked", { userId, reason });
  }
}

// Export singleton instance (environment will be set by the controller)
export const authService = new AuthService();