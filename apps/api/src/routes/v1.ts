import { Hono } from "hono";
import { rateLimit, rateLimitConfigs } from "../core/middleware/rate-limit";
import { auth } from "../core/middleware/auth";
import { getClientIP } from "../core/util/ip.utils";
import type { AppEnv } from "../core/env";
import { getAuthContainer } from "../features/auth/auth.container";
import type { IAuthController } from "../features/auth/auth.interfaces";
import { getSetupController } from "../features/setup/setup.container";
import type { ISetupController } from "../features/setup/setup.interfaces";
import { getPagesController } from "../features/pages/pages.container";
import type { IPagesController } from "../features/pages/pages.interfaces";

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

  // Request magic link with rate limiting
  authRouter.post(
    "/request-link",
    // rateLimit({
    //   maxRequests: rateLimitConfigs.emailPerIP.maxRequests,
    //   windowMs: rateLimitConfigs.emailPerIP.windowMs,
    //   keyGenerator: (c) => `auth:request-link:ip:${getClientIP(c)}`,
    // }),
    (c) => {
      const authController = getAuthController(c.env);
      return authController.requestMagicLink(c);
    }
  );

  // Consume magic link
  authRouter.get("/verify", (c) => {
    const authController = getAuthController(c.env);
    return authController.consumeMagicLink(c);
  });



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

  // Handoff pattern endpoints
  authRouter.post("/request", (c) => {
    const authController = getAuthController(c.env);
    return authController.createLoginRequest(c);
  });

  authRouter.get("/wait", (c) => {
    const authController = getAuthController(c.env);
    return authController.waitForLoginRequest(c);
  });

  authRouter.post("/finalize", (c) => {
    const authController = getAuthController(c.env);
    return authController.finalizeLoginRequest(c);
  });

  authRouter.post("/verify-code", (c) => {
    const authController = getAuthController(c.env);
    return authController.verifyCode(c);
  });

  // Auth health check
  authRouter.get("/health", (c) => {
    const authController = getAuthController(c.env);
    return authController.healthCheck(c);
  });

  // Auth info endpoint
  authRouter.get("/", (c) => {
    return c.json({
      ok: true,
      service: "Authentication Service",
      version: "2.0.0",
      endpoints: {
        "POST /request-link": "Request magic link for passwordless login (legacy)",
        "GET /verify": "Verify magic link and create session (legacy)",
        "POST /request": "Create login request with handoff pattern",
        "GET /wait": "Wait for login request completion",
        "POST /finalize": "Finalize login request and create session",
        "POST /verify-code": "Verify 6-digit code (fallback)",
        "GET /me": "Get current user information",
        "POST /logout": "Logout and clear session",
        "GET /health": "Service health check",
      },
      features: [
        "Passwordless authentication with magic links",
        "Handoff pattern for mobile webview compatibility",
        "6-digit code fallback for email clients",
        "Secure session management with HttpOnly cookies",
        "Rate limiting and abuse protection",
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
  v1Router.route("/me", meRouter);

  // TODO: Add other route groups as they are migrated
  // v1Router.route("/pages", createPagesRouter(pagesController));
  // v1Router.route("/analytics", createAnalyticsRouter(analyticsController));
  // v1Router.route("/tiktok", createTiktokRouter(tiktokController));
  // v1Router.route("/tips", createTipsRouter(tipsController));
  // v1Router.route("/webhooks", createWebhooksRouter(webhooksController));

  return v1Router;
}
