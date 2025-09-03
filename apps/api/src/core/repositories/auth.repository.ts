import { BaseRepository } from "./base.repository";

// Auth-related data types
export interface MagicLinkToken {
  id: string;
  email: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date;
  ipCreatedFrom?: string;
  uaCreatedFrom?: string;
  redirectPath?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateMagicLinkTokenData {
  id: string;
  email: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  ipCreatedFrom?: string;
  uaCreatedFrom?: string;
  redirectPath?: string;
}

export interface CreateUserSessionData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateSessionData {
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
}

// Auth repository interface
export interface IAuthRepository {
  // Magic link token operations
  saveMagicLinkToken(data: CreateMagicLinkTokenData): Promise<void>;
  findMagicLinkTokenByHash(tokenHash: string): Promise<MagicLinkToken | null>;
  markTokenAsUsed(tokenId: string): Promise<void>;
  deleteExpiredMagicLinkTokens(): Promise<void>;
  
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
  
  // Magic link token operations
  async saveMagicLinkToken(data: CreateMagicLinkTokenData): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
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
        data.id,
        data.email,
        data.tokenHash,
        data.createdAt,
        data.expiresAt,
        data.ipCreatedFrom,
        data.uaCreatedFrom,
        data.redirectPath,
      ];

      await client.query(sql, params);
    } finally {
      await this.closeClient(client);
    }
  }

  async findMagicLinkTokenByHash(tokenHash: string): Promise<MagicLinkToken | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "magic_link_tokens" WHERE "tokenHash" = $1`;
      const { rows } = await client.query(sql, [tokenHash]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
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
    } finally {
      await this.closeClient(client);
    }
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        UPDATE "magic_link_tokens" 
        SET "usedAt" = $1 
        WHERE id = $2
      `;
      
      await client.query(sql, [new Date(), tokenId]);
    } finally {
      await this.closeClient(client);
    }
  }

  async deleteExpiredMagicLinkTokens(): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `DELETE FROM "magic_link_tokens" WHERE "expiresAt" < $1`;
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
      `;

      const params = [
        data.id,
        data.userId,
        data.tokenHash,
        data.expiresAt,
        data.createdAt,
        data.lastUsedAt,
        data.ipAddress,
        data.userAgent,
      ];

      await client.query(sql, params);
    } finally {
      await this.closeClient(client);
    }
  }

  async findSessionByHash(tokenHash: string): Promise<UserSession | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "user_sessions" WHERE "tokenHash" = $1`;
      const { rows } = await client.query(sql, [tokenHash]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
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
      
      const sql = `UPDATE "user_sessions" SET "lastUsedAt" = $1, "expiresAt" = $2 WHERE id = $3`;
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
