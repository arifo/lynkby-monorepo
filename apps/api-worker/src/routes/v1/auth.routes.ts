import { Hono } from "hono";
import { authController } from "../../features/auth/auth.controller";
import { rateLimit } from "../../core/middleware/rate-limit";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { RATE_LIMIT_CONFIG } from "../../features/auth/auth.schemas";
import { getClientIP } from "../../core/util/ip.utils";

// Create auth router
const authRouter = new Hono();

// Request magic link (no auth required) with targeted IP-based rate limit
authRouter.post(
  "/request-link",
  rateLimit({
    maxRequests: RATE_LIMIT_CONFIG.EMAIL_PER_IP.maxRequests,
    windowMs: RATE_LIMIT_CONFIG.EMAIL_PER_IP.windowMs,
    keyGenerator: (c) => `auth:request-link:ip:${getClientIP(c)}`,
  }),
  async (c) => {
  return authController.requestMagicLink(c);
});

// Consume magic link and create session (no auth required)
authRouter.get("/verify", async (c) => {
  return authController.consumeMagicLink(c);
});

// Setup username for first-time users (requires session)
authRouter.post("/setup-username", async (c) => {
  return authController.setupUsername(c);
});

// Get current user (requires session)
authRouter.get("/me", async (c) => {
  return authController.getCurrentUser(c);
});

// Logout user (requires session)
authRouter.post("/logout", async (c) => {
  return authController.logout(c);
});

// Check username availability (no auth required)
authRouter.get("/check-username", async (c) => {
  return authController.checkUsernameAvailability(c);
});

// Auth service health check
authRouter.get("/health", async (c) => {
  return authController.healthCheck(c);
});

// API info endpoint
authRouter.get("/", async (c) => {
  return c.json({
    ok: true,
    service: "Authentication Service",
    version: "2.0.0",
    endpoints: {
      "POST /request-link": "Request magic link for passwordless login",
      "GET /verify": "Verify magic link and create session",
      "POST /setup-username": "Setup username for first-time users",
      "GET /me": "Get current user information",
      "POST /logout": "Logout and clear session",
      "GET /check-username": "Check if username is available",
      "GET /health": "Service health check",
    },
    features: [
      "Passwordless authentication with magic links",
      "Secure session management with HttpOnly cookies",
      "Rate limiting and abuse protection",
      "Disposable email domain blocking",
      "Automatic session extension",
    ],
    documentation: "https://docs.lynkby.com/api/auth",
    timestamp: new Date().toISOString(),
  });
});

export default authRouter;
