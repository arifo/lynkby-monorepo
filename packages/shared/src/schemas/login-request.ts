import { z } from "zod";

// Request schemas
export const CreateLoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  redirectPath: z.string().optional(),
});

export const WaitRequestSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
});

export const FinalizeRequestSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  handshakeNonce: z.string().min(1, "Handshake nonce is required"),
});

export const CodeVerificationSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

// Response schemas
export const LoginRequestResponseSchema = z.object({
  ok: z.literal(true),
  requestId: z.string(),
  expiresAt: z.string(),
  handshakeNonce: z.string(),
  message: z.string(),
});

export const WaitResponseSchema = z.object({
  ok: z.literal(true),
  status: z.enum(["pending", "completed", "expired"]),
  userId: z.string().optional(),
  message: z.string(),
});

export const FinalizeResponseSchema = z.object({
  ok: z.literal(true),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string().optional(),
    isNewUser: z.boolean(),
  }),
  session: z.object({
    expiresAt: z.string(),
    maxAge: z.number(),
  }),
});

export const LoginRequestErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  code: z.string(),
  details: z.any().optional(),
});

// Type exports
export type CreateLoginRequestInput = z.infer<typeof CreateLoginRequestSchema>;
export type WaitRequestInput = z.infer<typeof WaitRequestSchema>;
export type FinalizeRequestInput = z.infer<typeof FinalizeRequestSchema>;
export type CodeVerificationInput = z.infer<typeof CodeVerificationSchema>;
export type LoginRequestResponse = z.infer<typeof LoginRequestResponseSchema>;
export type WaitResponse = z.infer<typeof WaitResponseSchema>;
export type FinalizeResponse = z.infer<typeof FinalizeResponseSchema>;
export type LoginRequestErrorResponse = z.infer<typeof LoginRequestErrorResponseSchema>;
