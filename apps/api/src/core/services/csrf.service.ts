import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { logger } from '../util/logger';
import { BaseService } from './base.service';
import { CsrfToken } from '@lynkby/shared';

export interface CsrfService {
  generateToken(): Promise<CsrfToken>;
  validateToken(token: string): Promise<boolean>;
  cleanupExpired(): Promise<void>;
}

class CsrfServiceImpl extends BaseService implements CsrfService {
  private readonly TOKEN_LENGTH = 32;
  private readonly TTL_MINUTES = 60; // 1 hour
  private readonly SECRET_KEY = 'csrf-secret'; // In production, use env var

  /**
   * Generate a new CSRF token
   */
  async generateToken(): Promise<CsrfToken> {
    try {
      // Generate random token
      const token = randomBytes(this.TOKEN_LENGTH).toString('hex');
      
      // Create HMAC signature for validation
      const signature = this.createSignature(token);
      const signedToken = `${token}.${signature}`;
      
      // Set expiration
      const expiresAt = new Date(Date.now() + this.TTL_MINUTES * 60 * 1000);
      
      // Store token in cache (in production, use Redis or similar)
      await this.storeToken(token, expiresAt);
      
      logger.debug('CSRF token generated', { 
        tokenId: token.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString()
      });
      
      return {
        token: signedToken,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to generate CSRF token', { error });
      throw new Error('Failed to generate CSRF token');
    }
  }

  /**
   * Validate a CSRF token
   */
  async validateToken(signedToken: string): Promise<boolean> {
    try {
      // Split token and signature
      const [token, signature] = signedToken.split('.');
      
      if (!token || !signature) {
        logger.warn('Invalid CSRF token format', { 
          tokenId: token?.substring(0, 8) + '...' || 'none'
        });
        return false;
      }
      
      // Verify signature
      const expectedSignature = this.createSignature(token);
      if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        logger.warn('CSRF token signature mismatch', { 
          tokenId: token.substring(0, 8) + '...'
        });
        return false;
      }
      
      // Check if token exists and is not expired
      const isValid = await this.isTokenValid(token);
      
      if (!isValid) {
        logger.warn('CSRF token is invalid or expired', { 
          tokenId: token.substring(0, 8) + '...'
        });
      }
      
      return isValid;
    } catch (error) {
      logger.error('Failed to validate CSRF token', { error });
      return false;
    }
  }

  /**
   * Clean up expired CSRF tokens
   */
  async cleanupExpired(): Promise<void> {
    try {
      // In production, implement cleanup logic for your storage backend
      // For now, this is a no-op as we're using in-memory storage
      logger.debug('CSRF token cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup expired CSRF tokens', { error });
    }
  }

  // Private helper methods

  private createSignature(token: string): string {
    const secret = this.getRequiredEnvVar('JWT_SECRET');
    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private async storeToken(token: string, expiresAt: Date): Promise<void> {
    try {
      const key = `csrf:${token}`;
      const value = JSON.stringify({ 
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });
      
      // Store with TTL in KV cache
      const ttl = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
      await this.getKV().put(key, value, { expirationTtl: ttl });
      
      logger.debug('CSRF token stored in KV', { 
        tokenId: token.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString(),
        ttl
      });
    } catch (error) {
      logger.error('Failed to store CSRF token', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenId: token.substring(0, 8) + '...'
      });
      throw error;
    }
  }

  private getKV() {
    return this.getEnvVar('KV_CACHE') as KVNamespace;
  }

  private async isTokenValid(token: string): Promise<boolean> {
    try {
      const key = `csrf:${token}`;
      const stored = await this.getKV().get(key);
      
      if (!stored) {
        logger.debug('CSRF token not found in storage', { 
          tokenId: token.substring(0, 8) + '...'
        });
        return false;
      }

      const data = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(data.expiresAt);
      
      if (now > expiresAt) {
        logger.debug('CSRF token expired', { 
          tokenId: token.substring(0, 8) + '...',
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString()
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate CSRF token in storage', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenId: token.substring(0, 8) + '...'
      });
      return false;
    }
  }
}

export const csrfService = new CsrfServiceImpl();
