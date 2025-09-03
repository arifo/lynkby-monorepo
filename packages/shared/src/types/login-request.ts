// Login request handoff pattern types

export interface LoginRequest {
  id: string;
  requestId: string;
  email: string;
  code: string;
  status: LoginRequestStatus;
  userId?: string;
  handshakeNonce?: string;
  expiresAt: Date;
  createdAt: Date;
  completedAt?: Date;
}

export type LoginRequestStatus = "pending" | "completed" | "expired";

export interface CreateLoginRequestOptions {
  email: string;
  ttlMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginRequestResult {
  requestId: string;
  code: string;
  expiresAt: Date;
  handshakeNonce: string;
}

export interface FinalizeRequest {
  requestId: string;
  handshakeNonce: string;
}

// Configuration constants
export const LOGIN_REQUEST_CONFIG = {
  TTL_MINUTES: 15, // 15 minutes expiry
  CODE_LENGTH: 6,
  MAX_ATTEMPTS: 3,
  CLEANUP_INTERVAL_MINUTES: 30,
} as const;
