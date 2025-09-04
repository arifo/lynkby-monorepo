import { userRepository, authRepository, type User, type MagicLinkToken as RepoMagicLinkToken, type UserSession as RepoUserSession } from "../../core/repositories";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { 
  MagicLinkToken, 
  UserSession, 
  AuthUser, 
  MagicLinkOptions, 
  SessionOptions,
  EmailValidationResult,
  DISPOSABLE_EMAIL_DOMAINS,
  AuthEvent
} from '@lynkby/shared';
import { MAGIC_LINK_CONFIG } from "./auth.schemas";
import { rateLimitService, rateLimitConfigs } from "../../core/services/rate-limit.service";
import { tokenUtils } from "../../core/util/token.utils";
import { emailService } from "../../core/services/email.service";
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

  // Helper method to convert RepoMagicLinkToken to MagicLinkToken
  private repoTokenToAuthToken(token: RepoMagicLinkToken): MagicLinkToken {
    return {
      id: token.id,
      email: token.email,
      tokenHash: token.tokenHash,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      ipCreatedFrom: token.ipCreatedFrom,
      uaCreatedFrom: token.uaCreatedFrom,
      redirectPath: token.redirectPath,
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

  // Create or update magic link token
  async createMagicLinkToken(options: MagicLinkOptions, secret: string): Promise<{ token: string; tokenData: MagicLinkToken, redirectPath: string }> {
    const { email, ttlMinutes = MAGIC_LINK_CONFIG.TTL_MINUTES, ipAddress, userAgent } = options;
    
    // Validate email
    const validation = await this.validateEmail(email);

    if (!validation.isValid) {
      throw createError.validationError(validation.reason || "Invalid email address");
    }
    
    if (validation.isDisposable) {
      throw createError.validationError("Disposable email addresses are not allowed");
    }

    // Ensure user exists (create if they don't)
    
    let user = await this.findUserByEmail(email);
    const isNewUser = !user;
    if (!user) {
      user = await this.createUser(email);
    }
    const redirectPath = isNewUser ? "/onboarding/username" : '/dashboard';

    // Generate unique token ID
    const tokenId = `magic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate JWT magic link token
    const token = tokenUtils.generateMagicLinkToken({
      email: email.toLowerCase(),
      tokenId,
      type: 'magic_link'
    }, secret, `${ttlMinutes}m`);

    // Hash the token for secure storage
    const tokenHash = tokenUtils.hashToken(token);
    
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);


    const magicLinkToken: MagicLinkToken = {
      id: tokenId,
      email: email.toLowerCase(), // Ensure email is lowercase
      tokenHash,
      createdAt: new Date(),
      expiresAt,
      ipCreatedFrom: ipAddress,
      uaCreatedFrom: userAgent,
    };

    // Save to database
    await this.saveMagicLinkToken(magicLinkToken);

    // Log the event
    this.logAuthEvent({
      type: 'magic_link_requested',
      email: email.toLowerCase(),
      ipAddress,
      userAgent,
      details: { tokenId, expiresAt, redirectPath },
    });

    logger.info("Magic link token created", { email, tokenId, expiresAt });
    
    return { token, tokenData: magicLinkToken, redirectPath };
  }

  // Save magic link token to database
  private async saveMagicLinkToken(token: MagicLinkToken): Promise<void> {
    await authRepository.saveMagicLinkToken({
      id: token.id,
      email: token.email,
      tokenHash: token.tokenHash,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      ipCreatedFrom: token.ipCreatedFrom,
      uaCreatedFrom: token.uaCreatedFrom,
      redirectPath: token.redirectPath,
    });
  }

  // Consume magic link token
  async consumeMagicLinkToken(token: string, secret: string): Promise<{ user: AuthUser; isNewUser: boolean }> {
    try {
      // Verify the JWT token
      const payload = tokenUtils.verifyMagicLinkToken(token, secret);
      
      if (payload.type !== 'magic_link') {
        throw createError.unauthorized("Invalid token type");
      }

      // Find the token in database by hash
      const tokenHash = tokenUtils.hashToken(token);
      const magicLinkToken = await this.findMagicLinkTokenByHash(tokenHash);
      
      if (!magicLinkToken) {
        this.logAuthEvent({
          type: 'magic_link_failed',
          ipAddress: 'unknown',
          details: { reason: 'token_not_found', tokenHash: tokenHash.substring(0, 8) + '...' },
        });
        throw createError.unauthorized("Invalid or expired magic link");
      }

      if (magicLinkToken.usedAt) {
        this.logAuthEvent({
          type: 'magic_link_failed',
          email: magicLinkToken.email,
          ipAddress: 'unknown',
          details: { reason: 'token_already_used', tokenId: magicLinkToken.id },
        });
        throw createError.unauthorized("This magic link has already been used");
      }

      if (magicLinkToken.expiresAt < new Date()) {
        this.logAuthEvent({
          type: 'magic_link_failed',
          email: magicLinkToken.email,
          ipAddress: 'unknown',
          details: { reason: 'token_expired', tokenId: magicLinkToken.id },
        });
        throw createError.unauthorized("Magic link has expired");
      }

      // Mark token as used
      await this.markTokenAsUsed(magicLinkToken.id);

      // Find or create user
      let user = await this.findUserByEmail(magicLinkToken.email);
      if (!user) {
        user = await this.createUser(magicLinkToken.email);
      }
      const isNewUser = user?.username === null;

      if (!isNewUser) {
         // Update last login
        await this.updateLastLogin(user.id);
      }

      // Log successful consumption
      this.logAuthEvent({
        type: 'magic_link_consumed',
        userId: user?.id,
        email: magicLinkToken.email,
        ipAddress: magicLinkToken.ipCreatedFrom,
        userAgent: magicLinkToken.uaCreatedFrom,
        details: { tokenId: magicLinkToken.id, isNewUser, redirectPath: magicLinkToken.redirectPath },
      });

      logger.info("Magic link consumed successfully", { 
        email: magicLinkToken.email, 
        userId: user?.id, 
        isNewUser 
      });

      return { user: user!, isNewUser };
    } catch (error) {
      if (error instanceof Error && error.message.includes('jwt expired')) {
        throw createError.unauthorized("Magic link has expired");
      }
      if (error instanceof Error && error.message.includes('invalid signature')) {
        throw createError.unauthorized("Invalid magic link");
      }
      throw error;
    }
  }

  // Find magic link token by hash
  private async findMagicLinkTokenByHash(tokenHash: string): Promise<MagicLinkToken | null> {
    const token = await authRepository.findMagicLinkTokenByHash(tokenHash);
    return token ? this.repoTokenToAuthToken(token) : null;
  }

  // Mark token as used
  private async markTokenAsUsed(tokenId: string): Promise<void> {
    await authRepository.markTokenAsUsed(tokenId);
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
    const { userId, userAgent, ipAddress, maxAgeDays = MAGIC_LINK_CONFIG.SESSION_DAYS } = options;
    
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
      await this.updateSessionUsage(session.id, MAGIC_LINK_CONFIG.SESSION_DAYS);
      // Reflect new expiration in returned object
      session.expiresAt = new Date(Date.now() + MAGIC_LINK_CONFIG.SESSION_DAYS * 24 * 60 * 60 * 1000);

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



  async sendMagicLinkEmail(
    email: string,
    verificationUrl: string,
    code?: string,
  ): Promise<void> {
    try {
        await emailService.sendMagicLinkEmail({
          to: email,
          url: verificationUrl,
          code,
        });
        this.logAuthEvent({ type: 'magic_link_delivered', email, details: { via: 'resend' } });
    } catch (err) {
      logger.info(" Magic Link  email (dev log)", { email, verificationUrl });
      logger.warn(' Magic Link  email send failed', { email, error: err instanceof Error ? err.message : String(err) });
      this.logAuthEvent({ type: 'magic_link_failed', email, details: { stage: 'send_email', message: err instanceof Error ? err.message : String(err) } });
      throw err;
    }
  }

  // Clean up expired tokens and sessions
  async cleanupExpired(): Promise<void> {
    // Clean up expired magic link tokens
    await authRepository.deleteExpiredMagicLinkTokens();
    
    // Clean up expired sessions
    await authRepository.deleteExpiredSessions();
    
    logger.info("Expired tokens and sessions cleaned up");
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
