import { captureError, captureMessage } from "./sentry";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Error codes for consistent error handling
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  
  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",
  
  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  
  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  TIKTOK_API_ERROR: "TIKTOK_API_ERROR",
  STRIPE_API_ERROR: "STRIPE_API_ERROR",
} as const;

// Create specific error types
export const createError = {
  unauthorized: (message = "Unauthorized") => 
    new AppError(401, ErrorCodes.UNAUTHORIZED, message),
  
  forbidden: (message = "Forbidden") => 
    new AppError(403, ErrorCodes.FORBIDDEN, message),
  
  notFound: (message = "Resource not found") => 
    new AppError(404, ErrorCodes.NOT_FOUND, message),
  
  conflict: (message = "Resource conflict") => 
    new AppError(409, ErrorCodes.CONFLICT, message),
  
  validationError: (message = "Validation failed", details?: Record<string, any>) => 
    new AppError(400, ErrorCodes.VALIDATION_ERROR, message, details),
  
  rateLimited: (message = "Rate limit exceeded") => 
    new AppError(429, ErrorCodes.RATE_LIMITED, message),
  
  internalError: (message = "Internal server error") => 
    new AppError(500, ErrorCodes.INTERNAL_ERROR, message),
  
  externalServiceError: (service: string, message?: string) => 
    new AppError(502, ErrorCodes.EXTERNAL_SERVICE_ERROR, 
      message || `${service} service unavailable`),
};

// Error handler for Hono
export const errorHandler = (err: Error, c: any) => {
  console.error("API Error:", err);
  
  if (err instanceof AppError) {
    return c.json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      }
    }, err.statusCode);
  }
  
  // Handle Zod validation errors
  if (err.name === "ZodError") {
    return c.json({
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Validation failed",
        details: err.message,
        timestamp: new Date().toISOString(),
      }
    }, 400);
  }
  
  // Default error response
  return c.json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    }
  }, 500);
};
