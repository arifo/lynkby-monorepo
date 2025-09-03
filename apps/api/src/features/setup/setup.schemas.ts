import { z } from "zod";
import { USERNAME_RULES, USERNAME_ERRORS } from "./setup.types";

// Username validation schema
export const UsernameSchema = z
  .string()
  .min(1, USERNAME_ERRORS.EMPTY)
  .min(USERNAME_RULES.MIN_LENGTH, USERNAME_ERRORS.TOO_SHORT)
  .max(USERNAME_RULES.MAX_LENGTH, USERNAME_ERRORS.TOO_LONG)
  .regex(USERNAME_RULES.ALLOWED_CHARS, USERNAME_ERRORS.INVALID_CHARS)
  .refine(
    (username) => !USERNAME_RULES.RESERVED_WORDS.has(username.toLowerCase()),
    USERNAME_ERRORS.RESERVED_WORD
  );

// Check username request schema
export const CheckUsernameRequestSchema = z.object({
  username: UsernameSchema,
});

// Claim username request schema
export const ClaimUsernameRequestSchema = z.object({
  username: UsernameSchema,
});

// Username availability response schema
export const UsernameAvailabilityResponseSchema = z.object({
  ok: z.boolean(),
  available: z.boolean(),
  reason: z.string().optional(),
});

// Username claim response schema
export const UsernameClaimResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
  }).optional(),
  error: z.string().optional(),
});

// Setup error response schema
export const SetupErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  code: z.string(),
  details: z.record(z.any()).optional(),
});

// Export types
export type CheckUsernameRequest = z.infer<typeof CheckUsernameRequestSchema>;
export type ClaimUsernameRequest = z.infer<typeof ClaimUsernameRequestSchema>;
export type UsernameAvailabilityResponse = z.infer<typeof UsernameAvailabilityResponseSchema>;
export type UsernameClaimResponse = z.infer<typeof UsernameClaimResponseSchema>;
export type SetupErrorResponse = z.infer<typeof SetupErrorResponseSchema>;
