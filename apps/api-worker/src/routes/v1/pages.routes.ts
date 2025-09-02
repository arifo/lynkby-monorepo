import { Hono } from "hono";
import { z } from "zod";
import { rateLimit, rateLimitConfigs } from "../../core/middleware/rate-limit";
import { cache } from "../../core/middleware/cache";
import { auth } from "../../core/middleware/auth";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { RESERVED_USERNAMES } from "../../core/env";
import { pageRepository } from "../../core/repositories/page.repository";

const router = new Hono();

// Validation schemas
const UpsertPageSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  links: z.array(z.object({
    label: z.string().min(1).max(50),
    url: z.string().url(),
    order: z.number().int().min(0).default(0),
  })).max(50),
});

const CreatePageSchema = UpsertPageSchema.extend({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i),
});

// Get public page by username (no auth required)
router.get("/:username",
  rateLimit(rateLimitConfigs.public),
  cache({ maxAge: 300, staleWhileRevalidate: 60 }),
  async (c) => {
    const username = c.req.param("username").toLowerCase();

    if (RESERVED_USERNAMES.has(username)) {
      throw createError.validationError("Username is reserved");
    }

    try {
      // Look up page by username and include links
      const page = await pageRepository.findByUsername(username);
      if (!page) {
        throw createError.notFound("Page not found");
      }
      const pageWithLinks = await pageRepository.findWithLinks(page.id);
      const links = pageWithLinks?.links || [];

      const profile = {
        username,
        displayName: page.displayName,
        bio: page.bio,
        avatarUrl: page.avatarUrl,
        links: links.map((l) => ({ label: l.label, url: l.url, order: l.order })),
      };

      logger.logAPI("GET", `page:${username}`);
      return c.json({ ok: true, profile });
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error as any;
      }
      throw createError.internalError("Failed to fetch page");
    }
  }
);

// Create new page (requires auth)
router.post("/",
  rateLimit(rateLimitConfigs.authenticated),
  auth,
  async (c) => {
    try {
      const body = await c.req.json();
      const input = CreatePageSchema.parse(body);
      
      // Check if username is available
      if (RESERVED_USERNAMES.has(input.username.toLowerCase())) {
        throw createError.validationError("Username is reserved");
      }
      
      // TODO: Implement pages service
      // const page = await pagesService.create(c.get("userId"), input);
      
      logger.logAPI("CREATE", `page:${input.username}`, { userId: c.get("userId") });
      
      return c.json({ 
        ok: true, 
        message: "Page created successfully",
        username: input.username 
      }, 201);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to create page");
    }
  }
);

// Update existing page (requires auth)
router.put("/:username",
  rateLimit(rateLimitConfigs.authenticated),
  auth,
  async (c) => {
    const username = c.req.param("username").toLowerCase();
    
    try {
      const body = await c.req.json();
      const input = UpsertPageSchema.parse(body);
      
      // TODO: Implement pages service
      // const page = await pagesService.update(c.get("userId"), username, input);
      
      logger.logAPI("UPDATE", `page:${username}`, { userId: c.get("userId") });
      
      return c.json({ 
        ok: true, 
        message: "Page updated successfully",
        username 
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to update page");
    }
  }
);

// Delete page (requires auth)
router.delete("/:username",
  rateLimit(rateLimitConfigs.authenticated),
  auth,
  async (c) => {
    const username = c.req.param("username").toLowerCase();
    
    try {
      // TODO: Implement pages service
      // await pagesService.delete(c.get("userId"), username);
      
      logger.logAPI("DELETE", `page:${username}`, { userId: c.get("userId") });
      
      return c.json({ 
        ok: true, 
        message: "Page deleted successfully",
        username 
      });
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw createError.internalError("Failed to delete page");
    }
  }
);

export default router;
