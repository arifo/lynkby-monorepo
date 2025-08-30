import { Hono } from "hono";
import v1Routes from "./v1";
import healthRoutes from "./health.routes";

const router = new Hono();

// Mount all route groups
router.route("/", healthRoutes);
router.route("/v1", v1Routes);

// Legacy API routes for backward compatibility
router.route("/api", v1Routes);

export default router;
