import { databaseService } from "../../core/repositories";
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
  RateLimitState,
  AuthEvent
} from "./auth.types";
import { MAGIC_LINK_CONFIG, RATE_LIMIT_CONFIG } from "./auth.schemas";
import { tokenUtils } from "../../core/util/token.utils";
import { emailService } from "../../core/services/email.service";

export class AuthService {
  
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

  // Check rate limiting for email requests
  async checkRateLimit(email: string, ipAddress: string): Promise<RateLimitState> {
    const now = Date.now();
    
    // Check per-email rate limit
    const emailKey = `rate_limit:email:${email}`;
    const emailLimit = await this.getRateLimitState(emailKey, RATE_LIMIT_CONFIG.EMAIL_PER_ADDRESS);
    
    // Check per-IP rate limit
    const ipKey = `rate_limit:ip:${ipAddress}`;
    const ipLimit = await this.getRateLimitState(ipKey, RATE_LIMIT_CONFIG.EMAIL_PER_IP);
    
    // Return the more restrictive limit
    if (emailLimit.cooldown > 0) {
      return emailLimit;
    }
    
    if (ipLimit.cooldown > 0) {
      return ipLimit;
    }
    
    return {
      remaining: Math.min(emailLimit.remaining, ipLimit.remaining),
      resetTime: Math.max(emailLimit.resetTime, ipLimit.resetTime),
      cooldown: 0
    };
  }

  // Get rate limit state from KV
  private async getRateLimitState(key: string, config: { maxRequests: number; windowMs: number }): Promise<RateLimitState> {
    try {
      // This would use KV in production, but for now we'll simulate
      // In a real implementation, you'd check KV_CACHE.get(key)
      return {
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        cooldown: 0
      };
    } catch (error) {
      logger.warn("Failed to check rate limit", { key, error });
      // If rate limiting fails, allow the request
      return {
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
        cooldown: 0
      };
    }
  }

  // Create or update magic link token
  async createMagicLinkToken(options: MagicLinkOptions, secret: string): Promise<{ token: string; tokenData: MagicLinkToken }> {
    const { email, ttlMinutes = MAGIC_LINK_CONFIG.TTL_MINUTES, redirectPath, ipAddress, userAgent } = options;
    
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
    if (!user) {
      user = await this.createUser(email);
    }

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
      redirectPath,
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
    
    return { token, tokenData: magicLinkToken };
  }

  // Save magic link token to database
  private async saveMagicLinkToken(token: MagicLinkToken): Promise<void> {
    const sql = `
      INSERT INTO "magic_link_tokens" (id, email, "tokenHash", "createdAt", "expiresAt", "ipCreatedFrom", "uaCreatedFrom", "redirectPath")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET
        id = EXCLUDED.id,
        "tokenHash" = EXCLUDED."tokenHash",
        "expiresAt" = EXCLUDED."expiresAt",
        "createdAt" = EXCLUDED."createdAt",
        "ipCreatedFrom" = EXCLUDED."ipCreatedFrom",
        "uaCreatedFrom" = EXCLUDED."uaCreatedFrom",
        "redirectPath" = EXCLUDED."redirectPath",
        "usedAt" = NULL
    `;

    const params = [
      token.id,
      token.email,
      token.tokenHash,
      token.createdAt,
      token.expiresAt,
      token.ipCreatedFrom,
      token.uaCreatedFrom,
      token.redirectPath,
    ];

    await databaseService.execute(sql, params);
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
      const isNewUser = !user;

      if (isNewUser) {
        user = await this.createUser(magicLinkToken.email);
      } else if (user) {
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
    const sql = `SELECT * FROM "magic_link_tokens" WHERE "tokenHash" = $1`;
    const result = await databaseService.query(sql, [tokenHash]);
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      tokenHash: row.tokenHash,
      createdAt: new Date(row.createdAt),
      expiresAt: new Date(row.expiresAt),
      usedAt: row.usedAt ? new Date(row.usedAt) : undefined,
      ipCreatedFrom: row.ipCreatedFrom,
      uaCreatedFrom: row.uaCreatedFrom,
      redirectPath: row.redirectPath,
    };
  }

  // Mark token as used
  private async markTokenAsUsed(tokenId: string): Promise<void> {
    const sql = `
      UPDATE "magic_link_tokens" 
      SET "usedAt" = $1 
      WHERE id = $2
    `;
    
    await databaseService.execute(sql, [new Date(), tokenId]);
  }

  // Find user by email
  private async findUserByEmail(email: string): Promise<AuthUser | null> {
    const sql = `SELECT * FROM "users" WHERE email = $1`;
    const result = await databaseService.query(sql, [email.toLowerCase()]);
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : undefined,
      isVerified: true,
    };
  }

  // Create new user
  private async createUser(email: string): Promise<AuthUser> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sql = `
      INSERT INTO "users" (id, email, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await databaseService.query(sql, [id, email.toLowerCase(), now, now]);
    const row = result[0];

    return {
      id: row.id,
      email: row.email,
      username: row.username,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastLoginAt: undefined,
      isVerified: true,
    };
  }

  // Update user's last login time
  private async updateLastLogin(userId: string): Promise<void> {
    const sql = `UPDATE "users" SET "lastLoginAt" = $1 WHERE id = $2`;
    await databaseService.execute(sql, [new Date(), userId]);
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
    const sql = `
      INSERT INTO "user_sessions" (id, "userId", "tokenHash", "expiresAt", "createdAt", "lastUsedAt", "ipAddress", "userAgent")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const params = [
      session.id,
      session.userId,
      session.tokenHash,
      session.expiresAt,
      session.createdAt,
      session.lastUsedAt,
      session.ipAddress,
      session.userAgent,
    ];

    await databaseService.execute(sql, params);
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
    const sql = `SELECT * FROM "user_sessions" WHERE "tokenHash" = $1`;
    const result = await databaseService.query(sql, [tokenHash]);
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt),
      lastUsedAt: new Date(row.lastUsedAt),
      revokedAt: row.revokedAt ? new Date(row.revokedAt) : undefined,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    };
  }

  // Find user by ID
  private async findUserById(userId: string): Promise<AuthUser | null> {
    const sql = `SELECT * FROM "users" WHERE id = $1`;
    const result = await databaseService.query(sql, [userId]);
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : undefined,
      isVerified: true,
    };
  }

  // Update session last used time and extend expiration by given days
  private async updateSessionUsage(sessionId: string, extendDays: number): Promise<void> {
    const now = new Date();
    const newExpiresAt = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000);
    const sql = `UPDATE "user_sessions" SET "lastUsedAt" = $1, "expiresAt" = $2 WHERE id = $3`;
    await databaseService.execute(sql, [now, newExpiresAt, sessionId]);
  }

  // Delete session
  private async deleteSession(sessionId: string): Promise<void> {
    const sql = `DELETE FROM "user_sessions" WHERE id = $1`;
    await databaseService.execute(sql, [sessionId]);
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
    const sql = `UPDATE "user_sessions" SET "revokedAt" = $1 WHERE id = $2`;
    await databaseService.execute(sql, [new Date(), sessionId]);
  }

  // Update user username (for first-time users)
  async updateUsername(userId: string, username: string): Promise<AuthUser> {
    // Check if username is already taken
    const existingUser = await this.findUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      throw createError.conflict("Username is already taken");
    }

    const sql = `UPDATE "users" SET username = $1, "updatedAt" = $2 WHERE id = $3 RETURNING *`;
    const result = await databaseService.query(sql, [username, new Date(), userId]);
    
    if (result.length === 0) {
      throw createError.notFound("User not found");
    }

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : undefined,
      isVerified: true,
    };
  }

  // Find user by username
  public async findUserByUsername(username: string): Promise<AuthUser | null> {
    const sql = `SELECT * FROM "users" WHERE username = $1`;
    const result = await databaseService.query(sql, [username]);
    
    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : undefined,
      isVerified: true,
    };
  }

  // Send magic link email (placeholder - implement with your email service)
  async sendMagicLinkEmail(
    email: string,
    verificationUrl: string,
    config?: { provider?: 'resend'; apiKey?: string; from?: string; supportEmail?: string; appName?: string }
  ): Promise<void> {
    try {
      // If provider config present, send via provider
      if (config?.provider === 'resend' && config.apiKey && config.from) {
        await emailService.sendMagicLinkEmail({
          to: email,
          url: verificationUrl,
          from: config.from,
          supportEmail: config.supportEmail,
          appName: config.appName || 'Lynkby',
          provider: 'resend',
          apiKey: config.apiKey,
        });
        this.logAuthEvent({ type: 'magic_link_delivered', email, details: { via: 'resend' } });
        return;
      }

      // Fallback: log-only (development)
      this.logAuthEvent({ type: 'magic_link_delivered', email, details: { via: 'log' } });
      logger.info("Magic link email (dev log)", { email, verificationUrl });
      console.log(`🔗 Magic Link for ${email}: ${verificationUrl}`);
    } catch (err) {
      logger.warn('Magic link email send failed', { email, error: err instanceof Error ? err.message : String(err) });
      this.logAuthEvent({ type: 'magic_link_failed', email, details: { stage: 'send_email', message: err instanceof Error ? err.message : String(err) } });
      throw err;
    }
  }

  // Clean up expired tokens and sessions
  async cleanupExpired(): Promise<void> {
    const now = new Date();
    
    // Clean up expired magic link tokens
    const deleteExpiredTokensSql = `DELETE FROM "magic_link_tokens" WHERE "expiresAt" < $1`;
    await databaseService.execute(deleteExpiredTokensSql, [now]);
    
    // Clean up expired sessions
    const deleteExpiredSessionsSql = `DELETE FROM "user_sessions" WHERE "expiresAt" < $1`;
    await databaseService.execute(deleteExpiredSessionsSql, [now]);
    
    logger.info("Expired tokens and sessions cleaned up");
  }

  // Revoke all sessions for a user (for future email change functionality)
  async revokeAllUserSessions(userId: string, reason: string = 'security'): Promise<void> {
    const sql = `UPDATE "user_sessions" SET "revokedAt" = $1 WHERE "userId" = $2 AND "revokedAt" IS NULL`;
    await databaseService.execute(sql, [new Date(), userId]);
    
    // Log the event
    this.logAuthEvent({
      type: 'session_revoked',
      userId,
      details: { reason, count: 'all' },
    });
    
    logger.info("All user sessions revoked", { userId, reason });
  }
}

// Export singleton instance
export const authService = new AuthService();
