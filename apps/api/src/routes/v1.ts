import { Hono } from "hono";
import { auth } from "../core/middleware/auth";
import type { AppEnv } from "../core/env";
import { getAuthContainer } from "../features/auth/auth.container";
import type { IAuthController } from "../features/auth/auth.interfaces";
import { OtpController } from "../features/auth/otp.controller";
import { csrf, csrfToken } from "../core/middleware/csrf";
import { getSetupController } from "../features/setup/setup.container";
import type { ISetupController } from "../features/setup/setup.interfaces";
import { getPagesController } from "../features/pages/pages.container";
import { cleanupService } from "../core/services/cleanup.service";

/**
 * Helper function to get auth controller for a request
 * Creates auth container and returns controller (optimized for Cloudflare Workers)
 */
function getAuthController(env: AppEnv): IAuthController {
  const authContainer = getAuthContainer(env);
  return authContainer.getAuthController();
}

/**
 * Helper function to get setup controller for a request
 * Creates setup container and returns controller (optimized for Cloudflare Workers)
 */
function getSetupControllerInstance(env: AppEnv): ISetupController {
  return getSetupController(env);
}

/**
 * Create v1 API router with dependency injection
 */
export function createV1Router(): Hono<{ Bindings: AppEnv }> {
  const v1Router = new Hono<{ Bindings: AppEnv }>();

  // System routes
  v1Router.get("/", (c) => {
    return c.json({
      version: "v1",
      status: "active",
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: "/v1/auth",
        setup: "/v1/setup",
        pages: "/v1/pages",
        // TODO: Add other endpoints as they are migrated
        // pages: "/v1/pages",
        // tiktok: "/v1/tiktok",
        // tips: "/v1/tips",
        // analytics: "/v1/analytics",
        // webhooks: "/v1/webhooks",
      },
      documentation: "https://docs.lynkby.com/api/v1",
    });
  });

  // Auth routes
  const authRouter = new Hono<{ Bindings: AppEnv }>();




  // Get current user (protected)
  authRouter.get("/me", auth, (c) => {
    const authController = getAuthController(c.env);
    return authController.getCurrentUser(c);
  });

  // Logout (protected)
  authRouter.post("/logout", auth, (c) => {
    const authController = getAuthController(c.env);
    return authController.logout(c);
  });


  // OTP endpoints (new authentication method)
  function getOtpController(env: AppEnv): OtpController {
    return new OtpController({
      jwtSecret: env?.JWT_SECRET || "fallback-secret",
      appBase: env?.APP_BASE || "https://app.lynkby.com",
      nodeEnv: env?.NODE_ENV || "development",
    });
  }

  // Request OTP code (CSRF protection disabled for OTP endpoints due to rate limiting)
  authRouter.post("/otp/request", (c) => {
    const otpController = getOtpController(c.env);
    return otpController.requestOtp(c);
  });

  // Verify OTP code (CSRF protection disabled for OTP endpoints due to rate limiting)
  authRouter.post("/otp/verify", (c) => {
    const otpController = getOtpController(c.env);
    return otpController.verifyOtp(c);
  });

  // Resend OTP code (CSRF protection disabled for OTP endpoints due to rate limiting)
  authRouter.post("/otp/resend", (c) => {
    const otpController = getOtpController(c.env);
    return otpController.resendOtp(c);
  });


  // Cleanup endpoint (for cron jobs)
  authRouter.post("/cleanup", async (c) => {
    try {
      const result = await cleanupService.runCleanup();
      return c.json({ ok: true, ...result });
    } catch (error) {
      console.error('Cleanup failed', error);
      return c.json({ ok: false, error: "Cleanup failed" }, 500);
    }
  });

  // Auth health check
  authRouter.get("/health", (c) => {
    const authController = getAuthController(c.env);
    return authController.healthCheck(c);
  });

  // Auth info endpoint (sets CSRF token)
  authRouter.get("/", csrfToken, (c) => {
    return c.json({
      ok: true,
      service: "Authentication Service",
      version: "2.0.0",
      endpoints: {
        "POST /otp/request": "Request OTP code for authentication",
        "POST /otp/verify": "Verify OTP code and create session",
        "POST /otp/resend": "Resend OTP code",
        "GET /me": "Get current user information",
        "POST /logout": "Logout and clear session",
        "GET /health": "Service health check",
        "GET /": "Get service info and CSRF token",
      },
      features: [
        "OTP-based authentication with 6-digit codes",
        "Email delivery via Resend API",
        "CSRF protection for all mutating requests",
        "Rate limiting and abuse protection",
        "Secure session management with HttpOnly cookies",
        "Disposable email domain blocking",
        "Automatic session extension",
      ],
      documentation: "https://docs.lynkby.com/api/auth",
      timestamp: new Date().toISOString(),
    });
  });

  // Mount auth routes
  v1Router.route("/auth", authRouter);

  // Setup routes
  const setupRouter = new Hono<{ Bindings: AppEnv }>();

  // Check username availability (public endpoint)
  setupRouter.get("/check-username", (c) => {
    const setupController = getSetupControllerInstance(c.env);
    return setupController.checkUsername(c);
  });

  // Claim username (protected endpoint)
  setupRouter.post("/claim-username", auth, (c) => {
    const setupController = getSetupControllerInstance(c.env);
    return setupController.claimUsername(c);
  });

  // Setup default page (protected, idempotent)
  setupRouter.post("/page", auth, (c) => {
    const setupController = getSetupControllerInstance(c.env);
    return setupController.setupDefaultPage(c);
  });

    setupRouter.post("/first-save", auth, (c) => {
      const controller = getPagesController(c.env);
      return controller.markFirstSaveCompleted(c);
    });
    setupRouter.post("/checklist", auth, (c) => {
      const controller = getPagesController(c.env);
      return controller.updateChecklistItem(c);
    });

  // Setup health check
  setupRouter.get("/health", (c) => {
    const setupController = getSetupControllerInstance(c.env);
    return setupController.healthCheck(c);
  });

  // Setup info endpoint
  setupRouter.get("/", (c) => {
    return c.json({
      ok: true,
      service: "Setup Service",
      version: "1.0.0",
      endpoints: {
        "GET /check-username": "Check if username is available",
        "POST /claim-username": "Claim a username for authenticated user",
        "POST /page": "Setup default page for authenticated user",
        "POST /first-save": "Mark first save completed for authenticated user",
        "POST /checklist": "Update checklist item for authenticated user",
        "GET /health": "Service health check",
      },
      features: [
        "Username validation and availability checking",
        "Secure username claiming with session validation",
        "Comprehensive username rules and reserved word filtering",
        "Real-time availability checking",
      ],
      documentation: "https://docs.lynkby.com/api/setup",
      timestamp: new Date().toISOString(),
    });
  });

  // Mount setup routes
  v1Router.route("/setup", setupRouter);

  // Pages routes (public)
  const pagesRouter = new Hono<{ Bindings: AppEnv }>();

  pagesRouter.get(":username", (c) => {
    const controller = getPagesController(c.env);
    return controller.getPublicProfile(c);
  });

  // Info
  pagesRouter.get("/", (c) => {
    return c.json({ ok: true, service: "Pages Service", version: "1.0.0", endpoints: { "GET /:username": "Public profile by username" } });
  });

  v1Router.route("/pages", pagesRouter);

  // Public JSON for Edge Worker
  const publicRouter = new Hono<{ Bindings: AppEnv }>();
  publicRouter.get("/page/by-username/:username", (c) => {
    const controller = getPagesController(c.env);
    return controller.getPublicPageByUsername(c);
  });
  v1Router.route("/public", publicRouter);

  // Me routes (protected)
  const meRouter = new Hono<{ Bindings: AppEnv }>();
  meRouter.get("/page", auth, (c) => {
    const controller = getPagesController(c.env);
    return controller.getMyPage(c);
  });
  meRouter.put("/page", auth, (c) => {
    const controller = getPagesController(c.env);
    return controller.updateMyPage(c);
  });
  meRouter.post("/links/bulk-upsert", auth, (c) => {
    const controller = getPagesController(c.env);
    return controller.replaceMyLinks(c);
  });
  meRouter.post("/publish", auth, (c) => {
    const controller = getPagesController(c.env);
    return controller.publish(c);
  });
  meRouter.get("/summary", auth, (c) => {
    const controller = getPagesController(c.env);
    return controller.getSummary(c);
  });
  v1Router.route("/me", meRouter);

  // TODO: Add other route groups as they are migrated
  // v1Router.route("/pages", createPagesRouter(pagesController));
  // v1Router.route("/analytics", createAnalyticsRouter(analyticsController));
  // v1Router.route("/tiktok", createTiktokRouter(tiktokController));
  // v1Router.route("/tips", createTipsRouter(tipsController));
  // v1Router.route("/webhooks", createWebhooksRouter(webhooksController));

  return v1Router;
}
