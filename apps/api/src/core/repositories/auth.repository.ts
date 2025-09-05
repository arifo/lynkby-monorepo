import { BaseRepository } from "./base.repository";
import type { 
  UserSession,
  CreateUserSessionData,
  UpdateSessionData,
  OtpToken,
  CreateOtpTokenData
} from '@lynkby/shared';

// Auth repository interface
export interface IAuthRepository {
  // OTP token operations
  saveOtpToken(data: CreateOtpTokenData): Promise<void>;
  findMostRecentOtpToken(email: string): Promise<OtpToken | null>;
  incrementOtpAttempts(tokenId: string): Promise<void>;
  markOtpAsConsumed(tokenId: string): Promise<void>;
  deleteExpiredOtpTokens(): Promise<void>;
  
  // User session operations
  saveUserSession(data: CreateUserSessionData): Promise<void>;
  findSessionByHash(tokenHash: string): Promise<UserSession | null>;
  updateSessionUsage(sessionId: string, lastUsedAt: Date, expiresAt: Date): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
}

// Auth repository implementation
export class AuthRepository extends BaseRepository implements IAuthRepository {
  
  // OTP token operations
  
  async saveOtpToken(data: CreateOtpTokenData): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        INSERT INTO "otp_tokens" (id, email, "codeHash", "createdAt", "expiresAt", attempts, "ipCreatedFrom", "uaCreatedFrom")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("codeHash") DO UPDATE SET
          id = EXCLUDED.id,
          email = EXCLUDED.email,
          "expiresAt" = EXCLUDED."expiresAt",
          "createdAt" = EXCLUDED."createdAt",
          attempts = 0,
          "consumedAt" = NULL,
          "ipCreatedFrom" = EXCLUDED."ipCreatedFrom",
          "uaCreatedFrom" = EXCLUDED."uaCreatedFrom"
      `;
      
      await client.query(sql, [
        data.id,
        data.email,
        data.codeHash,
        data.createdAt,
        data.expiresAt,
        data.attempts,
        data.ipCreatedFrom,
        data.uaCreatedFrom,
      ]);
    } finally {
      await this.closeClient(client);
    }
  }
  
  async findMostRecentOtpToken(email: string): Promise<OtpToken | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        SELECT id, email, "codeHash", "createdAt", "expiresAt", "consumedAt", attempts, "ipCreatedFrom", "uaCreatedFrom"
        FROM "otp_tokens"
        WHERE email = $1 AND "consumedAt" IS NULL AND "expiresAt" > $2
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;
      
      const result = await client.query(sql, [email, new Date()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        codeHash: row.codeHash,
        createdAt: new Date(row.createdAt),
        expiresAt: new Date(row.expiresAt),
        consumedAt: row.consumedAt ? new Date(row.consumedAt) : undefined,
        attempts: row.attempts,
        ipCreatedFrom: row.ipCreatedFrom,
        uaCreatedFrom: row.uaCreatedFrom,
      };
    } finally {
      await this.closeClient(client);
    }
  }
  
  async incrementOtpAttempts(tokenId: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `UPDATE "otp_tokens" SET attempts = attempts + 1 WHERE id = $1`;
      await client.query(sql, [tokenId]);
    } finally {
      await this.closeClient(client);
    }
  }
  
  async markOtpAsConsumed(tokenId: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `UPDATE "otp_tokens" SET "consumedAt" = $1 WHERE id = $2`;
      await client.query(sql, [new Date(), tokenId]);
    } finally {
      await this.closeClient(client);
    }
  }
  
  async deleteExpiredOtpTokens(): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `DELETE FROM "otp_tokens" WHERE "expiresAt" < $1`;
      await client.query(sql, [new Date()]);
    } finally {
      await this.closeClient(client);
    }
  }

  // User session operations
  
  async saveUserSession(data: CreateUserSessionData): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        INSERT INTO "user_sessions" (id, "userId", "tokenHash", "expiresAt", "createdAt", "lastUsedAt", "ipAddress", "userAgent")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("tokenHash") DO UPDATE SET
          "lastUsedAt" = EXCLUDED."lastUsedAt",
          "expiresAt" = EXCLUDED."expiresAt"
      `;
      
      await client.query(sql, [
        data.id,
        data.userId,
        data.tokenHash,
        data.expiresAt,
        data.createdAt,
        data.lastUsedAt,
        data.ipAddress,
        data.userAgent,
      ]);
    } finally {
      await this.closeClient(client);
    }
  }

  async findSessionByHash(tokenHash: string): Promise<UserSession | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        SELECT id, "userId", "tokenHash", "expiresAt", "createdAt", "lastUsedAt", "revokedAt", "ipAddress", "userAgent"
        FROM "user_sessions"
        WHERE "tokenHash" = $1 AND "revokedAt" IS NULL AND "expiresAt" > $2
      `;
      
      const result = await client.query(sql, [tokenHash, new Date()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
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
    } finally {
      await this.closeClient(client);
    }
  }

  async updateSessionUsage(sessionId: string, lastUsedAt: Date, expiresAt: Date): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        UPDATE "user_sessions" 
        SET "lastUsedAt" = $1, "expiresAt" = $2 
        WHERE id = $3 AND "revokedAt" IS NULL
      `;
      
      await client.query(sql, [lastUsedAt, expiresAt, sessionId]);
    } finally {
      await this.closeClient(client);
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `UPDATE "user_sessions" SET "revokedAt" = $1 WHERE id = $2`;
      await client.query(sql, [new Date(), sessionId]);
    } finally {
      await this.closeClient(client);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `DELETE FROM "user_sessions" WHERE id = $1`;
      await client.query(sql, [sessionId]);
    } finally {
      await this.closeClient(client);
    }
  }

  async deleteExpiredSessions(): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `DELETE FROM "user_sessions" WHERE "expiresAt" < $1`;
      await client.query(sql, [new Date()]);
    } finally {
      await this.closeClient(client);
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `UPDATE "user_sessions" SET "revokedAt" = $1 WHERE "userId" = $2 AND "revokedAt" IS NULL`;
      await client.query(sql, [new Date(), userId]);
    } finally {
      await this.closeClient(client);
    }
  }
}

// Export singleton instance
export const authRepository = new AuthRepository();