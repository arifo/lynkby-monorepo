import { randomBytes, createHash } from 'crypto';
import { logger } from '../util/logger';
import { BaseService } from './base.service';
import { 
  OtpToken, 
  OtpOptions, 
  OtpVerificationOptions, 
  OtpRequestResult, 
  OtpVerificationResult,
  AuthUser,
  UserSession,
  SessionOptions,
  OTP_CONFIG
} from '@lynkby/shared';
import { createError } from '../errors';
import { authRepository, userRepository } from '../repositories';
import { tokenUtils } from '../util/token.utils';

export interface OtpService {
  generateOtp(options: OtpOptions): Promise<{ code: string; tokenData: OtpToken }>;
  verifyOtp(options: OtpVerificationOptions): Promise<OtpVerificationResult>;
  createSession(options: SessionOptions, secret: string): Promise<{ session: UserSession; plaintextToken: string }>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createUser(email: string): Promise<AuthUser>;
  cleanupExpired(): Promise<void>;
}

class OtpServiceImpl extends BaseService implements OtpService {
  /**
   * Generate a 6-digit OTP code and store it in the database
   */
  async generateOtp(options: OtpOptions): Promise<{ code: string; tokenData: OtpToken }> {
    const { email: rawEmail, ttlMinutes = OTP_CONFIG.TTL_MINUTES, ipAddress, userAgent } = options;
    const email = rawEmail.toLowerCase();
    
    // Generate 6-digit code
    const code = this.generateSixDigitCode();
    const codeHash = this.hashCode(code);
    
    // Ensure user exists first (required for foreign key constraint)
    let user = await this.findUserByEmail(email);
    if (!user) {
      user = await this.createUser(email);
    }
    
    // Create token data
    const tokenId = randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    
    const tokenData: OtpToken = {
      id: tokenId,
      email,
      codeHash,
      createdAt: now,
      expiresAt,
      attempts: 0,
      ipCreatedFrom: ipAddress,
      uaCreatedFrom: userAgent,
    };
    
    // Store in database
    await this.saveOtpToken(tokenData);
    
    logger.logAPI('OTP_GENERATED', `email:${email}`, { 
      email, 
      ipAddress, 
      tokenId,
      expiresAt: expiresAt.toISOString()
    });
    
    return { code, tokenData };
  }
  
  /**
   * Verify an OTP code
   */
  async verifyOtp(options: OtpVerificationOptions): Promise<OtpVerificationResult> {
    const { email: rawEmail, code, ipAddress, userAgent } = options;
    const email = rawEmail.toLowerCase();
    
    try {
      // Find the most recent unconsumed OTP for this email
      const otpToken = await this.findMostRecentOtp(email);
      
      if (!otpToken) {
        logger.logAPI('OTP_VERIFICATION_FAILED', `email:${email}`, { 
          email, 
          ipAddress, 
          reason: 'no_otp_found' 
        });
        return { ok: false, error: 'INVALID_OR_EXPIRED' };
      }
      
      // Check if OTP has expired
      if (otpToken.expiresAt < new Date()) {
        logger.logAPI('OTP_VERIFICATION_FAILED', `email:${email}`, { 
          email, 
          ipAddress, 
          reason: 'expired',
          tokenId: otpToken.id
        });
        return { ok: false, error: 'INVALID_OR_EXPIRED' };
      }
      
      // Check if already consumed
      if (otpToken.consumedAt) {
        logger.logAPI('OTP_VERIFICATION_FAILED', `email:${email}`, { 
          email, 
          ipAddress, 
          reason: 'already_consumed',
          tokenId: otpToken.id
        });
        return { ok: false, error: 'INVALID_OR_EXPIRED' };
      }
      
      // Check attempt limit
      if (otpToken.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        logger.logAPI('OTP_VERIFICATION_FAILED', `email:${email}`, { 
          email, 
          ipAddress, 
          reason: 'max_attempts_exceeded',
          tokenId: otpToken.id,
          attempts: otpToken.attempts
        });
        return { ok: false, error: 'INVALID_OR_EXPIRED' };
      }
      
      // Verify the code
      const codeHash = this.hashCode(code);
      if (codeHash !== otpToken.codeHash) {
        // Increment attempts
        await this.incrementOtpAttempts(otpToken.id);
        
        logger.logAPI('OTP_VERIFICATION_FAILED', `email:${email}`, { 
          email, 
          ipAddress, 
          reason: 'invalid_code',
          tokenId: otpToken.id,
          attempts: otpToken.attempts + 1
        });
        return { ok: false, error: 'INVALID_OR_EXPIRED' };
      }
      
      // Mark as consumed
      await this.markOtpAsConsumed(otpToken.id);
      
      // Find or create user
      let user = await this.findUserByEmail(email);
      if (!user) {
        user = await this.createUser(email);
      }
      
      const isNewUser = !user.username;
      
      // Create session
      const { session, plaintextToken } = await this.createSession({
        userId: user.id,
        userAgent,
        ipAddress,
      }, this.getRequiredEnvVar('JWT_SECRET'));
      
      logger.logAPI('OTP_VERIFICATION_SUCCESS', `user:${user.id}`, { 
        email, 
        ipAddress, 
        userId: user.id,
        isNewUser,
        tokenId: otpToken.id
      });
      
      return {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          isVerified: user.isVerified,
          isNewUser,
        },
        session: {
          expiresAt: session.expiresAt.toISOString(),
          maxAge: OTP_CONFIG.SESSION_DAYS * 24 * 60 * 60, // 30 days in seconds
        },
      };
      
    } catch (error) {
      logger.error('OTP verification failed', { error, email, ipAddress });
      return { ok: false, error: 'INTERNAL_ERROR' };
    }
  }
  
  /**
   * Create a user session
   */
  async createSession(options: SessionOptions, secret: string): Promise<{ session: UserSession; plaintextToken: string }> {
    const { userId, userAgent, ipAddress, maxAgeDays = OTP_CONFIG.SESSION_DAYS } = options;
    
    // Get user data for JWT payload
    const user = await this.findUserByEmail(await this.getUserEmailById(userId));
    if (!user) {
      throw createError.notFound("User not found");
    }
    
    // Generate JWT session token
    const plaintextToken = tokenUtils.generateSessionToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    }, secret, `${maxAgeDays}d`);
    
    // Hash the token for secure storage
    const tokenHash = tokenUtils.hashToken(plaintextToken);
    
    // Create session data
    const sessionId = randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + maxAgeDays * 24 * 60 * 60 * 1000);
    
    const session: UserSession = {
      id: sessionId,
      userId,
      tokenHash,
      expiresAt,
      createdAt: now,
      lastUsedAt: now,
      ipAddress,
      userAgent,
    };
    
    // Store session
    await this.saveSession(session);
    
    return { session, plaintextToken };
  }
  
  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      isVerified: true,
      isNewUser: !user.username,
    };
  }
  
  /**
   * Create a new user
   */
  async createUser(email: string): Promise<AuthUser> {
    const user = await userRepository.createUserForAuth(email.toLowerCase());
    
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      isVerified: true,
      isNewUser: !user.username,
    };
  }
  
  /**
   * Clean up expired OTP tokens
   */
  async cleanupExpired(): Promise<void> {
    try {
      await authRepository.deleteExpiredOtpTokens();
      logger.info('Expired OTP tokens cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup expired OTP tokens', { error });
    }
  }
  
  // Private helper methods
  
  private generateSixDigitCode(): string {
    // Generate a random code with configurable length
    const codeLength = this.getEnvVar('OTP_CODE_LENGTH') as number || OTP_CONFIG.CODE_LENGTH;
    const min = Math.pow(10, codeLength - 1);
    const max = Math.pow(10, codeLength) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
  
  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
  
  private async saveOtpToken(tokenData: OtpToken): Promise<void> {
    await authRepository.saveOtpToken({
      id: tokenData.id,
      email: tokenData.email,
      codeHash: tokenData.codeHash,
      createdAt: tokenData.createdAt,
      expiresAt: tokenData.expiresAt,
      attempts: tokenData.attempts,
      ipCreatedFrom: tokenData.ipCreatedFrom,
      uaCreatedFrom: tokenData.uaCreatedFrom,
    });
  }
  
  private async findMostRecentOtp(email: string): Promise<OtpToken | null> {
    return await authRepository.findMostRecentOtpToken(email);
  }
  
  private async incrementOtpAttempts(tokenId: string): Promise<void> {
    await authRepository.incrementOtpAttempts(tokenId);
  }
  
  private async markOtpAsConsumed(tokenId: string): Promise<void> {
    await authRepository.markOtpAsConsumed(tokenId);
  }
  
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
  
  private async getUserEmailById(userId: string): Promise<string> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw createError.notFound("User not found");
    }
    return user.email;
  }
}

export const otpService = new OtpServiceImpl();
