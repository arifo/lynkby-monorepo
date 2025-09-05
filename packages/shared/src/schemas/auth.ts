import { z } from "zod";

// OTP request schema
export const RequestOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;

// OTP verification schema
export const VerifyOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Code must contain only digits"),
});

export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

// OTP resend schema
export const ResendOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ResendOtpInput = z.infer<typeof ResendOtpSchema>;


// Username setup schema (for first-time users)
export const SetupUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-z0-9_-]+$/i, "Username can only contain letters, numbers, hyphens, and underscores")
    .refine(
      (username) => !["www", "app", "api", "static", "cdn", "help", "admin", "status", "docs", "login", "logout", "signup", "auth", "dashboard", "profile", "settings"].includes(username.toLowerCase()),
      "Username is reserved"
    ),
});

export type SetupUsernameInput = z.infer<typeof SetupUsernameSchema>;

// Session response schema
export const SessionResponseSchema = z.object({
  ok: z.literal(true),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    username: z.string().optional(),
    isNewUser: z.boolean(),
  }),
  session: z.object({
    expiresAt: z.string(),
    maxAge: z.number(),
  }),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

// OTP request response schema
export const OtpRequestResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
  cooldown: z.number().optional(), // seconds until next request allowed
});

export type OtpRequestResponse = z.infer<typeof OtpRequestResponseSchema>;

// OTP verification response schema
export const OtpVerificationResponseSchema = z.object({
  ok: z.literal(true),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    username: z.string().optional(),
    isNewUser: z.boolean(),
  }),
  session: z.object({
    expiresAt: z.string(),
    maxAge: z.number(),
  }),
});

export type OtpVerificationResponse = z.infer<typeof OtpVerificationResponseSchema>;


// Error response schema
export const AuthErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  code: z.string(),
  cooldown: z.number().optional(), // seconds until next request allowed
  details: z.record(z.any()).optional(),
});

export type AuthErrorResponse = z.infer<typeof AuthErrorResponseSchema>;

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // OTP rate limits (per AUTH.MD spec)
  OTP_EMAIL_PER_ADDRESS: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  OTP_EMAIL_PER_IP: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  OTP_EMAIL_DAILY: {
    maxRequests: 20,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  OTP_RESEND_COOLDOWN: {
    maxRequests: 1,
    windowMs: 30 * 1000, // 30 seconds
  },
  OTP_VERIFY_ATTEMPTS: {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes (per OTP)
  },
} as const;

// OTP configuration
export const OTP_CONFIG = {
  CODE_LENGTH: 6,
  TTL_MINUTES: 10,
  SESSION_DAYS: 30,
  MAX_ATTEMPTS: 5, // max attempts to verify a code
  RESEND_COOLDOWN_SECONDS: 30,
} as const;

