import { Hono } from "hono";
import v1Routes from "./v1";
import healthRoutes from "./health.routes";

const router = new Hono();

// Root route handler
router.get("/", (c) => {
  return c.json({
    name: "Lynkby API",
    version: "1.0.0",
    status: "active",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/_health",
      v1: "/v1",
      api: "/api", // legacy
    },
    documentation: "https://docs.lynkby.com/api",
    support: "https://support.lynkby.com",
  });
});

// Mount all route groups
router.route("/", healthRoutes);
router.route("/v1", v1Routes);

// Legacy API routes for backward compatibility
router.route("/api", v1Routes);

export default router;
