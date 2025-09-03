import type { Context } from "hono";
import type { 
  MagicLinkToken, 
  UserSession, 
  AuthUser, 
  MagicLinkOptions, 
  SessionOptions,
  EmailValidationResult,
  AuthEvent
} from "./auth.types";
import type { RateLimitState } from "../../core/services/rate-limit.service";
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

  sendMagicLinkEmail(email: string, verificationUrl: string): Promise<void>;
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
