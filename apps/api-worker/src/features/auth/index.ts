// Export all authentication-related modules
export { authService } from "./auth.service";
export { authController } from "./auth.controller";

// Export types
export type {
  MagicLinkToken,
  UserSession,
  AuthUser,
  MagicLinkOptions,
  SessionOptions,
  EmailValidationResult,
  RateLimitState,
  AuthContext,
  MagicLinkEmailData,
} from "./auth.types";

// Export schemas
export {
  RequestMagicLinkSchema,
  ConsumeMagicLinkSchema,
  SetupUsernameSchema,
  SessionResponseSchema,
  MagicLinkResponseSchema,
  AuthErrorResponseSchema,
  RATE_LIMIT_CONFIG,
  MAGIC_LINK_CONFIG,
} from "./auth.schemas";

// Export types from schemas
export type {
  RequestMagicLinkInput,
  ConsumeMagicLinkInput,
  SetupUsernameInput,
  SessionResponse,
  MagicLinkResponse,
  AuthErrorResponse,
} from "./auth.schemas";
