import type { Context } from "hono";
import type { 
  MagicLinkToken, 
  UserSession, 
  AuthUser, 
  MagicLinkOptions, 
  SessionOptions,
  EmailValidationResult,
  AuthEvent,
  RateLimitState
} from '@lynkby/shared';
import type { AppEnv } from "../../core/env";

/**
 * Interface for authentication service operations
 */
export interface IAuthService {
  validateEmail(email: string): Promise<EmailValidationResult>;
  checkRateLimit(email: string, ipAddress: string, context: any): Promise<RateLimitState>;
  createMagicLinkToken(options: MagicLinkOptions, secret: string): Promise<{ token: string; tokenData: MagicLinkToken, redirectPath: string }>;
  consumeMagicLinkToken(token: string, secret: string): Promise<{ user: AuthUser; isNewUser: boolean }>;
  createSession(options: SessionOptions, secret: string): Promise<{ session: UserSession; plaintextToken: string }>;
  validateSession(sessionToken: string, secret: string): Promise<{ user: AuthUser; session: UserSession } | null>;
  deleteSessionByToken(token: string): Promise<void>;
  findUserById(userId: string): Promise<AuthUser | null>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createUser(email: string): Promise<AuthUser>;

  sendMagicLinkEmail(email: string, verificationUrl: string, code?: string): Promise<void>;
  cleanupExpired(): Promise<void>;
  revokeAllUserSessions(userId: string, reason?: string): Promise<void>;
  setEnvironment(env: AppEnv): void;
}



/**
 * Interface for authentication controller operations
 */
export interface IAuthController {
  requestMagicLink(c: Context): Promise<Response>;
  consumeMagicLink(c: Context): Promise<Response>;
  getCurrentUser(c: Context): Promise<Response>;
  logout(c: Context): Promise<Response>;
  createLoginRequest(c: Context): Promise<Response>;
  waitForLoginRequest(c: Context): Promise<Response>;
  finalizeLoginRequest(c: Context): Promise<Response>;
  verifyCode(c: Context): Promise<Response>;
  healthCheck(c: Context): Promise<Response>;
}

/**
 * Interface for dependency injection container
 */
export interface IAuthContainer {
  getAuthService(): IAuthService;
  getAuthController(): IAuthController;
  setEnvironment(env: AppEnv): void;
}

/**
 * Configuration for auth module dependencies
 */
export interface AuthModuleConfig {
  jwtSecret: string;
  appBase: string;
  nodeEnv: string;
  kvCache?: KVNamespace;
}
