import { Hono } from "hono";
import { z } from "zod";
import { auth, optionalAuth } from "../../core/middleware/auth";
import { tokenUtils } from "../../core/middleware/auth";
import { createError } from "../../core/errors";
import { rateLimit, rateLimitConfigs } from "../../core/middleware/rate-limit";
import { logger } from "../../core/util/logger";

// Input validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string()
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"]
});

// Create auth router
const authRouter = new Hono();

// Apply rate limiting to auth endpoints
authRouter.use("*", rateLimit(rateLimitConfigs.auth));

// User registration
authRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = RegisterSchema.parse(body);
    
    // TODO: Implement user registration logic
    // - Check if user already exists
    // - Hash password
    // - Create user in database
    // - Generate tokens
    
    logger.logAPI("register", "user", { email: validatedData.email, username: validatedData.username });
    
    // Mock response for now
    return c.json({
      success: true,
      message: "User registered successfully",
      data: {
        userId: "mock-user-id",
        email: validatedData.email,
        username: validatedData.username
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError.validationError("Validation failed", error.errors);
    }
    throw error;
  }
});

// User login
authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = LoginSchema.parse(body);
    
    // TODO: Implement user login logic
    // - Verify user credentials
    // - Generate access and refresh tokens
    // - Update last login timestamp
    
    logger.logAPI("login", "user", { email: validatedData.email });
    
    // Mock response for now
    const mockUser = {
      userId: "mock-user-id",
      email: validatedData.email,
      username: "mockuser"
    };
    
    const accessToken = tokenUtils.generateAccessToken(mockUser, "mock-secret");
    const refreshToken = tokenUtils.generateRefreshToken(mockUser, "mock-secret");
    
    return c.json({
      success: true,
      message: "Login successful",
      data: {
        user: mockUser,
        accessToken,
        refreshToken,
        expiresIn: 3600 // 1 hour
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError.validationError("Validation failed", error.errors);
    }
    throw error;
  }
});

// Refresh access token
authRouter.post("/refresh", async (c) => {
  try {
    const body = await c.req.json();
    const { refreshToken: token } = RefreshTokenSchema.parse(body);
    
    // TODO: Implement token refresh logic
    // - Verify refresh token
    // - Check if token is valid and not expired
    // - Generate new access token
    // - Optionally rotate refresh token
    
    logger.logAPI("refresh", "token");
    
    // Mock response for now
    const mockUser = {
      userId: "mock-user-id",
      email: "mock@example.com",
      username: "mockuser"
    };
    
    const newAccessToken = tokenUtils.generateAccessToken(mockUser, "mock-secret");
    
    return c.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
        expiresIn: 3600 // 1 hour
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError.validationError("Validation failed", error.errors);
    }
    throw error;
  }
});

// Get current user (requires authentication)
authRouter.get("/me", auth, async (c) => {
  try {
    const userId = c.get("userId");
    const user = c.get("user");
    
    // TODO: Implement get current user logic
    // - Fetch user data from database
    // - Return user profile information
    
    logger.logAPI("get", "current_user", { userId });
    
    return c.json({
      success: true,
      message: "Current user retrieved successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          // Add more user fields as needed
        }
      }
    });
  } catch (error) {
    throw error;
  }
});

// User logout
authRouter.post("/logout", auth, async (c) => {
  try {
    const userId = c.get("userId");
    
    // TODO: Implement logout logic
    // - Invalidate refresh token
    // - Add token to blacklist if needed
    // - Update user session status
    
    logger.logAPI("logout", "user", { userId });
    
    return c.json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    throw error;
  }
});

// Change password (requires authentication)
authRouter.post("/change-password", auth, async (c) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const validatedData = ChangePasswordSchema.parse(body);
    
    // TODO: Implement password change logic
    // - Verify current password
    // - Hash new password
    // - Update password in database
    // - Invalidate all existing tokens
    
    logger.logAPI("change_password", "user", { userId });
    
    return c.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError.validationError("Validation failed", error.errors);
    }
    throw error;
  }
});

// Optional auth endpoint example
authRouter.get("/profile", optionalAuth, async (c) => {
  const userId = c.get("userId");
  
  if (userId) {
    // User is authenticated
    const user = c.get("user");
    return c.json({
      success: true,
      message: "Authenticated profile",
      data: { user, isAuthenticated: true }
    });
  } else {
    // User is not authenticated
    return c.json({
      success: true,
      message: "Public profile",
      data: { isAuthenticated: false }
    });
  }
});

export default authRouter;
