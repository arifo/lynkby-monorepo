import { z } from "zod";

// Magic link request schema
export const RequestMagicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  // Optional path on the app to redirect to after verification
  redirectPath: z.string().startsWith('/').max(200).optional(),
});

export type RequestMagicLinkInput = z.infer<typeof RequestMagicLinkSchema>;

// Magic link consumption schema
export const ConsumeMagicLinkSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type ConsumeMagicLinkInput = z.infer<typeof ConsumeMagicLinkSchema>;

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

// Magic link response schema
export const MagicLinkResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
  cooldown: z.number().optional(), // seconds until next request allowed
});

export type MagicLinkResponse = z.infer<typeof MagicLinkResponseSchema>;

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
  EMAIL_PER_ADDRESS: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  EMAIL_PER_IP: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

// Magic link configuration
export const MAGIC_LINK_CONFIG = {
  TOKEN_LENGTH: 32,
  TTL_MINUTES: 15,
  SESSION_DAYS: 30,
  MAX_ATTEMPTS: 3, // max attempts to consume a token
} as const;
