// OTP token interface
export interface OtpToken {
  id: string;
  email: string;
  codeHash: string; // Only store hashed codes
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date; // Track when code was consumed
  attempts: number; // Track failed attempts
  ipCreatedFrom?: string; // IP address where code was created
  uaCreatedFrom?: string; // User agent where code was created
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


// Session creation options
export interface SessionOptions {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  maxAgeDays?: number;
}

// Auth event logging interface
export interface AuthEvent {
  type: 'otp_requested' | 'otp_delivered' | 'otp_verified' | 'otp_failed' | 'session_created' | 'session_revoked' | 'user_login' | 'user_logout';
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

// CSRF token interface
export interface CsrfToken {
  token: string;
  expiresAt: Date;
}

// OTP request/response types
export interface OtpRequestResult {
  ok: boolean;
  cooldown?: number; // seconds until next request allowed
  error?: string;
}

export interface OtpVerificationResult {
  ok: boolean;
  user?: AuthUser;
  session?: {
    expiresAt: string;
    maxAge: number;
  };
  error?: string;
}

// OTP generation options
export interface OtpOptions {
  email: string;
  ttlMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

// OTP verification options
export interface OtpVerificationOptions {
  email: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}
