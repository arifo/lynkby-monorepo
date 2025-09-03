import { z } from "zod";

// Common response schemas
export const SuccessResponseSchema = z.object({
  ok: z.literal(true),
});

export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  code: z.string(),
  details: z.record(z.any()).optional(),
});

// Health check schema
export const HealthCheckResponseSchema = z.object({
  status: z.literal("healthy"),
  timestamp: z.string(),
  version: z.string(),
  environment: z.string(),
  database: z.object({
    status: z.enum(["connected", "disconnected"]),
    responseTime: z.number(),
  }),
});

// Pagination schemas
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const PaginationResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// Common types
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
