import { Context } from "hono";
import type { IPagesController, IPagesService, PagesModuleConfig } from "./pages.interfaces";
import { createError } from "../../core/errors";

export class PagesController implements IPagesController {
  private readonly pagesService: IPagesService;
  private readonly config: PagesModuleConfig;

  constructor(pagesService: IPagesService, config: PagesModuleConfig) {
    this.pagesService = pagesService;
    this.config = config;
  }

  private setEnvironment(c: Context) {
    this.pagesService.setEnvironment(c.env);
  }

  async getPublicProfile(c: Context): Promise<Response> {
    try {
      this.setEnvironment(c);
      const { username } = c.req.param();
      const result = await this.pagesService.getPublicProfileByUsername(username);
      if (!result.ok || !result.profile) {
        return c.json({ ok: false, error: "NOT_FOUND" }, 404);
      }
      return c.json({ ok: true, profile: result.profile });
    } catch (err) {
      if (err instanceof Error) throw err;
      throw createError.internalError("Failed to fetch profile");
    }
  }

  async getPublicPageByUsername(c: Context): Promise<Response> {
    try {
      this.setEnvironment(c);
      const { username } = c.req.param();
      const result = await this.pagesService.getPublicPageJSON(username);
      if (!result.ok || !result.data) {
        return c.json({ error: "NOT_FOUND" }, 404);
      }
      return c.json(result.data);
    } catch (err) {
      if (err instanceof Error) throw err;
      throw createError.internalError("Failed to fetch public page");
    }
  }

  async getMyPage(c: Context): Promise<Response> {
    this.setEnvironment(c);
    const userId = c.get("userId");
    const result = await this.pagesService.getMyPage(userId);
    if (!result.ok) return c.json({ ok: false, error: "NOT_FOUND" }, 404);
    return c.json({
      page: result.page,
      profile: result.profile,
      links: result.links,
      liveUrl: result.liveUrl,
      fallbackUrl: result.fallbackUrl,
    });
  }

  async updateMyPage(c: Context): Promise<Response> {
    this.setEnvironment(c);
    const userId = c.get("userId");
    const body = await c.req.json();
    const { displayName, avatarUrl, bio, published, layout, theme } = body ?? {};
    const result = await this.pagesService.updateMyPage(userId, { displayName, avatarUrl, bio, published, layout, theme });
    if (!result.ok) {
      if (result.error) {
        return c.json({ ok: false, error: result.error }, 400);
      }
      return c.json({ ok: false, error: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true });
  }

  async replaceMyLinks(c: Context): Promise<Response> {
    this.setEnvironment(c);
    const userId = c.get("userId");
    const body = await c.req.json();
    const links = Array.isArray(body?.links) ? body.links : [];
    const result = await this.pagesService.replaceMyLinks(userId, links);
    if (!result.ok) {
      if (result.error) {
        return c.json({ ok: false, error: result.error }, 400);
      }
      return c.json({ ok: false, error: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true, count: result.count });
  }

  async publish(c: Context): Promise<Response> {
    this.setEnvironment(c);
    const userId = c.get("userId");
    const ok = await this.pagesService.publish(userId);
    if (!ok.ok) return c.json({ ok: false, error: "NOT_FOUND" }, 404);
    return c.json({ ok: true });
  }
}
