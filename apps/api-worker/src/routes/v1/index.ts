import { Hono } from "hono";
import authRoutes from "./auth.routes";
import usernameRoutes from "./username.routes";
import pagesRoutes from "./pages.routes";
import tiktokRoutes from "./tiktok.routes";
import tipsRoutes from "./tips.routes";
import analyticsRoutes from "./analytics.routes";
import webhooksRoutes from "./webhooks.routes";

const v1Router = new Hono();

// Mount all v1 feature routers
v1Router.route("/auth", authRoutes);
v1Router.route("/username", usernameRoutes);
v1Router.route("/pages", pagesRoutes);
v1Router.route("/tiktok", tiktokRoutes);
v1Router.route("/tips", tipsRoutes);
v1Router.route("/analytics", analyticsRoutes);
v1Router.route("/webhooks", webhooksRoutes);

// v1 API info endpoint
v1Router.get("/", async (c) => {
  return c.json({
    version: "v1",
    status: "active",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/v1/auth",
      pages: "/v1/pages",
      tiktok: "/v1/tiktok",
      tips: "/v1/tips",
      analytics: "/v1/analytics",
      webhooks: "/v1/webhooks",
    },
    documentation: "https://docs.lynkby.com/api/v1",
  });
});

export default v1Router;
