import { databaseService } from "../services/database.service";
import { BaseRepository } from "./base.repository";
import type { 
  LoginRequest, 
  LoginRequestStatus, 
  CreateLoginRequestOptions,
  LoginRequestResult 
} from "@lynkby/shared";

export class LoginRequestRepository extends BaseRepository {

  // Create a new login request
  async createLoginRequest(options: CreateLoginRequestOptions): Promise<LoginRequestResult> {
    if (!this.getEnv()) {
      throw new Error("Environment not set");
    }

    const { email, ttlMinutes = 15, ipAddress, userAgent } = options;
    
    // Generate unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate handshake nonce
    const handshakeNonce = `nonce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    const query = `
      INSERT INTO login_requests (
        "requestId", email, code, status, "handshakeNonce", "expiresAt"
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await databaseService.query(query, [
      requestId,
      email.toLowerCase(),
      code,
      "pending",
      handshakeNonce,
      expiresAt
    ]);
    
    if (result.length === 0) {
      throw new Error("Failed to create login request");
    }
    
    return {
      requestId,
      code,
      expiresAt,
      handshakeNonce,
    };
  }

  // Find login request by request ID
  async findByRequestId(requestId: string): Promise<LoginRequest | null> {
    if (!this.getEnv()) {
      throw new Error("Environment not set");
    }

    const query = `
      SELECT 
        id, "requestId", email, code, status, "userId", "handshakeNonce", 
        "expiresAt", "createdAt", "completedAt"
      FROM login_requests 
      WHERE "requestId" = $1
    `;
    
    const result = await databaseService.query(query, [requestId]);
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    return {
      id: row.id,
      requestId: row.requestId,
      email: row.email,
      code: row.code,
      status: row.status,
      userId: row.userId,
      handshakeNonce: row.handshakeNonce,
      expiresAt: new Date(row.expiresAt),
      createdAt: new Date(row.createdAt),
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined
    };
  }

  // Update login request status
  async updateStatus(
    requestId: string, 
    status: LoginRequestStatus, 
    userId?: string
  ): Promise<void> {
    if (!this.getEnv()) {
      throw new Error("Environment not set");
    }

    const query = `
      UPDATE login_requests 
      SET status = $2, "userId" = $3, "completedAt" = CASE WHEN $2 = 'completed' THEN NOW() ELSE "completedAt" END
      WHERE "requestId" = $1
    `;
    
    await databaseService.query(query, [requestId, status, userId]);
  }

  // Mark login request as completed
  async markAsCompleted(requestId: string, userId: string): Promise<void> {
    await this.updateStatus(requestId, "completed", userId);
  }

  // Mark login request as expired
  async markAsExpired(requestId: string): Promise<void> {
    await this.updateStatus(requestId, "expired");
  }

  // Clean up expired login requests
  async cleanupExpired(): Promise<number> {
    if (!this.getEnv()) {
      throw new Error("Environment not set");
    }

    const query = `
      DELETE FROM login_requests 
      WHERE "expiresAt" < NOW() AND status = 'pending'
    `;
    
    await databaseService.execute(query);
    // For DELETE queries, we can't easily get rowCount with current databaseService
    // This is acceptable for cleanup operations
    return 0;
  }

  // Validate handshake nonce
  async validateHandshakeNonce(requestId: string, nonce: string): Promise<boolean> {
    if (!this.getEnv()) {
      throw new Error("Environment not set");
    }

    const query = `
      SELECT "handshakeNonce" 
      FROM login_requests 
      WHERE "requestId" = $1 AND status = 'completed'
    `;
    
    const result = await databaseService.query(query, [requestId]);
    
    if (result.length === 0) {
      return false;
    }
    
    return result[0].handshakeNonce === nonce;
  }

  // Invalidate handshake nonce after use
  async invalidateHandshakeNonce(requestId: string): Promise<void> {
    if (!this.getEnv()) {
      throw new Error("Environment not set");
    }

    const query = `
      UPDATE login_requests 
      SET "handshakeNonce" = NULL 
      WHERE "requestId" = $1
    `;
    
    await databaseService.query(query, [requestId]);
  }
}

// Export singleton instance
export const loginRequestRepository = new LoginRequestRepository();
