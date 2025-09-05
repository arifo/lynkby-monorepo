import { BaseService } from "./base.service";
import { authRepository } from "../repositories/auth.repository";
import { logger } from "../util/logger";

/**
 * Service for cleaning up expired tokens and sessions
 */
export class CleanupService extends BaseService {
  
  /**
   * Clean up expired OTP tokens
   */
  async cleanupExpiredOtpTokens(): Promise<{ deleted: number }> {
    try {
      await authRepository.deleteExpiredOtpTokens();
      
      logger.info('Expired OTP tokens cleaned up');
      return { deleted: 0 }; // We don't track count in the current implementation
    } catch (error) {
      logger.error('Failed to cleanup expired OTP tokens', { error });
      throw error;
    }
  }
  
  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<{ deleted: number }> {
    try {
      await authRepository.deleteExpiredSessions();
      
      logger.info('Expired sessions cleaned up');
      return { deleted: 0 }; // We don't track count in the current implementation
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error });
      throw error;
    }
  }
  
  /**
   * Run all cleanup tasks
   */
  async runCleanup(): Promise<{
    otpTokens: { deleted: number };
    sessions: { deleted: number };
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting cleanup tasks');
      
      const [otpTokens, sessions] = await Promise.all([
        this.cleanupExpiredOtpTokens(),
        this.cleanupExpiredSessions(),
      ]);
      
      const duration = Date.now() - startTime;
      logger.info('Cleanup tasks completed', { 
        otpTokens: otpTokens.deleted,
        sessions: sessions.deleted,
        duration 
      });
      
      return { otpTokens, sessions };
    } catch (error) {
      logger.error('Cleanup tasks failed', { error, duration: Date.now() - startTime });
      throw error;
    }
  }
}

export const cleanupService = new CleanupService();
