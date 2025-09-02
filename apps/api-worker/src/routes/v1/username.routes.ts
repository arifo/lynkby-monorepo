import { Hono } from "hono";
import { logger } from "../../core/util/logger";
import { createError } from "../../core/errors";
import { getClientIP } from "../../core/util/ip.utils";
import { validateUsername } from "../../core/util/username";
import { authService } from "../../features/auth/auth.service";
import { pageRepository } from "../../core/repositories/page.repository";

const router = new Hono();

// Local helpers for rate limiting using KV with custom keys
async function bumpKV(c: any, key: string, max: number, windowMs: number) {
  // Check if KV_CACHE is available
  if (!c.env.KV_CACHE) {
    console.warn("KV_CACHE not available, allowing request without rate limiting");
    return { limited: false, cooldown: 0 } as const;
  }
  
  const now = Date.now();
  let raw: string | null = null;
  try {
    raw = await c.env.KV_CACHE.get(key);
  } catch (error) {
    console.warn("Failed to read from KV_CACHE:", error);
    return { limited: false, cooldown: 0 } as const;
  }
  
  let count = 0;
  let expiresAt = now + windowMs;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { count: number; expiresAt: number };
      count = parsed.count;
      expiresAt = parsed.expiresAt > now ? parsed.expiresAt : now + windowMs;
    } catch {}
  }
  count = expiresAt > now ? count + 1 : 1;
  if (count > max) {
    return { limited: true, cooldown: Math.ceil((expiresAt - now) / 1000) } as const;
  }
  
  try {
    await c.env.KV_CACHE.put(key, JSON.stringify({ count, expiresAt }), {
      expirationTtl: Math.max(1, Math.ceil((expiresAt - now) / 1000)),
    });
  } catch (error) {
    console.warn("Failed to write to KV_CACHE:", error);
  }
  
  return { limited: false, cooldown: 0 } as const;
}

async function requireSession(c: any) {
  const cookie = c.req.header("Cookie");
  const sessionToken = cookie?.match(/session_token=([^;]+)/)?.[1];
  if (!sessionToken) throw createError.unauthorized("Unauthorized");
  const session = await authService.validateSession(sessionToken, c.env.JWT_SECRET);
  if (!session) throw createError.unauthorized("Unauthorized");
  return session.user;
}

// GET /v1/username/availability?u={candidate}
router.get("/availability", async (c) => {
  try {
    c.header("Cache-Control", "no-store");
    // Auth required per spec
    const user = await requireSession(c);
    const ip = getClientIP(c);

    const candidate = c.req.query("u") || "";
    const { normalized, valid, reasons } = validateUsername(candidate);
    if (!valid) {
      return c.json({
        username: candidate,
        normalized,
        valid: false,
        available: false,
        reasons,
      }, 400);
    }

    // Rate limit: 30/min per IP, 15/min per user
    const rlIp = await bumpKV(c, `rl:username:avail:ip:${ip}`, 30, 60_000);
    const rlUser = await bumpKV(c, `rl:username:avail:user:${user.id}`, 15, 60_000);
    if (rlIp.limited || rlUser.limited) {
      return c.json({ ok: false, error: "RATE_LIMITED" }, 429);
    }

    const exists = await authService.findUserByUsername(normalized);
    const available = !exists;
    return c.json({
      username: candidate,
      normalized,
      valid: true,
      available,
      reasons: available ? [] : ["TAKEN"],
    });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) throw error;
    logger.error("username availability failed", { error });
    return c.json({ ok: false, error: "INTERNAL" }, 500);
  }
});

// POST /v1/username/claim { username }
router.post("/claim", async (c) => {
  try {
    c.header("Cache-Control", "no-store");
    const user = await requireSession(c);
    const body = await c.req.json().catch(() => ({}));
    const username: string = (body?.username ?? "").toString();
    const { normalized, valid, reasons } = validateUsername(username);
    if (!valid) {
      return c.json({ ok: false, error: reasons[0] || "INVALID_FORMAT" }, 400);
    }

    // Ensure user doesn't already have a username
    if (user?.username) {
      return c.json({ ok: false, error: "ALREADY_SET" }, 409);
    }

    // Try to set username; rely on unique index for race-safety
    try {
      const updated = await authService.updateUsername(user.id, normalized);
      // Auto-create a default page for the user if not exists
      try {
        const existing = await pageRepository.findByUserId(user.id);
        if (!existing) {
          const emailLocal = (user.email || "").split("@")[0] || normalized;
          const displayName = emailLocal
            .replace(/[._-]+/g, " ")
            .split(" ")
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ") || normalized;
          await pageRepository.create({ userId: user.id, displayName });
          logger.info("Auto-created page for user", { userId: user.id, username: normalized });
        }
      } catch (err) {
        logger.warn("Failed to auto-create page", { userId: user.id, error: err instanceof Error ? err.message : String(err) });
      }
      const urls = {
        subdomain: `https://${normalized}.lynkby.com`,
        path: `https://lynkby.com/u/${normalized}`,
      };
      return c.json({ ok: true, username: normalized, urls }, 201);
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e);
      if (msg.includes("taken") || msg.includes("conflict") || msg.includes("unique")) {
        return c.json({ ok: false, error: "TAKEN" }, 409);
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) throw error;
    logger.error("username claim failed", { error });
    return c.json({ ok: false, error: "INTERNAL" }, 500);
  }
});

// Info
router.get("/", (c) => c.json({ ok: true, endpoints: ["GET /availability", "POST /claim"] }));

export default router;
