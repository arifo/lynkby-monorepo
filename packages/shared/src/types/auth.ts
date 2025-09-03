// Magic link token interface
export interface MagicLinkToken {
  id: string;
  email: string;
  tokenHash: string; // Only store hashed tokens
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date; // Track when token was consumed
  ipCreatedFrom?: string; // IP address where token was created
  uaCreatedFrom?: string; // User agent where token was created
  redirectPath?: string; // Where to redirect after verification
}

// User session interface
export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string; // Only store hashed tokens
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date; // Track session revocation
  ipAddress?: string; // IP address where session was created
  userAgent?: string; // User agent where session was created
}

// User interface with authentication state
export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isVerified: boolean;
  isNewUser?: boolean; // Added for dashboard compatibility
}

// Magic link email template data
export interface MagicLinkEmailData {
  email: string;
  verificationUrl: string;
  expiresAt: Date;
  dashboardUrl: string;
  supportEmail: string;
}

// Rate limiting state
export interface RateLimitState {
  remaining: number;
  resetTime: number;
  cooldown: number;
}

// Authentication context for Hono
export interface AuthContext {
  userId: string;
  user: AuthUser;
  session: UserSession;
}

// Magic link generation options
export interface MagicLinkOptions {
  email: string;
  ttlMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

// Session creation options
export interface SessionOptions {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  maxAgeDays?: number;
}

// Auth event logging interface
export interface AuthEvent {
  type: 'magic_link_requested' | 'magic_link_delivered' | 'magic_link_consumed' | 'magic_link_failed' | 'session_created' | 'session_revoked' | 'user_login' | 'user_logout';
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// Email validation result
export interface EmailValidationResult {
  isValid: boolean;
  isDisposable: boolean;
  reason?: string;
}
