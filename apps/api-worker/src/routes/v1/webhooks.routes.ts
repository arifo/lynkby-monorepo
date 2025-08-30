import { Hono } from "hono";
import { rateLimit, rateLimitConfigs } from "../../core/middleware/rate-limit";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";

const router = new Hono();

// TikTok webhook for content updates
router.post("/tiktok",
  rateLimit(rateLimitConfigs.webhook),
  async (c) => {
    try {
      const body = await c.req.raw.text();
      const signature = c.req.header("x-tiktok-signature");
      
      if (!signature) {
        throw createError.unauthorized("Missing TikTok signature");
      }
      
      // TODO: Implement TikTok webhook verification
      // const event = await webhookService.verifyTikTokWebhook(body, signature);
      
      logger.logAPI("WEBHOOK_TIKTOK", "webhook", { 
        signature: signature.substring(0, 10) + "..." 
      });
      
      return c.json({ 
        ok: true, 
        message: "TikTok webhook processed successfully" 
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to process TikTok webhook");
    }
  }
);

// Stripe webhook for payment events
router.post("/stripe",
  rateLimit(rateLimitConfigs.webhook),
  async (c) => {
    try {
      const body = await c.req.raw.text();
      const signature = c.req.header("stripe-signature");
      
      if (!signature) {
        throw createError.unauthorized("Missing Stripe signature");
      }
      
      // TODO: Implement Stripe webhook verification
      // const event = await webhookService.verifyStripeWebhook(body, signature);
      
      logger.logAPI("WEBHOOK_STRIPE", "webhook", { 
        signature: signature.substring(0, 10) + "..." 
      });
      
      return c.json({ 
        ok: true, 
        message: "Stripe webhook processed successfully" 
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to process Stripe webhook");
    }
  }
);

// Generic webhook endpoint for other services
router.post("/:service",
  rateLimit(rateLimitConfigs.webhook),
  async (c) => {
    try {
      const service = c.req.param("service");
      const body = await c.req.raw.text();
      const headers = Object.fromEntries(c.req.raw.headers.entries());
      
      // TODO: Implement generic webhook processing
      // await webhookService.processGenericWebhook(service, body, headers);
      
      logger.logAPI("WEBHOOK_GENERIC", `service:${service}`, { 
        service,
        headers: Object.keys(headers) 
      });
      
      return c.json({ 
        ok: true, 
        message: `${service} webhook processed successfully` 
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to process webhook");
    }
  }
);

// Webhook health check
router.get("/health",
  rateLimit(rateLimitConfigs.public),
  async (c) => {
    try {
      return c.json({ 
        ok: true, 
        message: "Webhook service is healthy",
        timestamp: new Date().toISOString(),
        supportedServices: ["tiktok", "stripe", "generic"],
      });
    } catch (error) {
      logger.error("Webhook health check failed", { error: error as Error });
      throw createError.internalError("Webhook service unhealthy");
    }
  }
);

export default router;
