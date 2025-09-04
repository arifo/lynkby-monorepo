import { BaseService } from "../../core/services/base.service";
import { pageRepository, userRepository } from "../../core/repositories";
import { logger } from "../../core/util/logger";
import { validateUrl, validateLinkTitle, validateTheme, validateLinksCount, validateDisplayName, validateBio } from "../../core/util/validation";
import type { IPagesService } from "./pages.interfaces";
import type { Profile } from "@lynkby/shared";

export class PagesService extends BaseService implements IPagesService {
  async getPublicProfileByUsername(username: string): Promise<{ ok: boolean; profile?: Profile }> {
    const uname = (username || "").toLowerCase();
    if (!uname) return { ok: false };

    // Ensure repos have env
    pageRepository.setEnvironment(this.getEnv());
    userRepository.setEnvironment(this.getEnv());

    // Verify user exists first (also allows checking unpublished later if needed)
    const user = await userRepository.findByUsername(uname);
    if (!user) {
      return { ok: false };
    }

    // Get page by username
    const page = await pageRepository.findByUsername(uname);
    if (!page) {
      return { ok: false };
    }

    // Fetch links ordered by position
    const withLinks = await pageRepository.findWithLinks(page.id);
    const links = withLinks?.links || [];

    const profile: Profile = {
      username: uname,
      displayName: user.displayName || `@${uname}`,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
      links: links.map(l => ({ label: l.title, url: l.url, order: l.position }))
    };

    logger.logAPI("PUBLIC_PROFILE_FETCHED", `username:${uname}`, { username: uname, linkCount: links.length });

    return { ok: true, profile };
  }

  async getPublicPageJSON(username: string): Promise<{ ok: boolean; data?: { username: string; displayName?: string; avatarUrl?: string; bio?: string; page: { layout: string; theme: string; published: boolean; updatedAt: string }; links: Array<{ title: string; url: string; active: boolean; position: number }> } }> {
    userRepository.setEnvironment(this.getEnv());
    pageRepository.setEnvironment(this.getEnv());

    const uname = (username || "").toLowerCase();
    if (!uname) return { ok: false };

    const user = await userRepository.findByUsername(uname);
    if (!user) return { ok: false };
    const page = await pageRepository.findByUserId(user.id);
    if (!page) return { ok: false };
    if (page.published === false) return { ok: false };
    const withLinks = await pageRepository.findWithLinks(page.id);
    const links = (withLinks?.links || []).filter(l => l.active !== false);

    return {
      ok: true,
      data: {
        username: uname,
        displayName: user.displayName || undefined,
        avatarUrl: user.avatarUrl || undefined,
        bio: user.bio || undefined,
        page: {
          layout: (page as any).layout || "LINKS_LIST",
          theme: (page as any).theme || "classic",
          published: page.published === true,
          updatedAt: page.updatedAt.toISOString(),
        },
        links: links.map((l, i) => ({ title: l.title, url: l.url, active: l.active !== false, position: l.position ?? i })),
      }
    };
  }

  async getMyPage(userId: string): Promise<{ ok: boolean; page?: any; profile?: any; links?: any[]; liveUrl?: string; fallbackUrl?: string }> {
    userRepository.setEnvironment(this.getEnv());
    pageRepository.setEnvironment(this.getEnv());

    const user = await userRepository.findById(userId);
    if (!user) {
      logger.error("getMyPage: User not found", { userId });
      return { ok: false };
    }

    const page = await pageRepository.findByUserId(userId);
    if (!page) {
      logger.error("getMyPage: Page not found for user", { userId, userEmail: user.email });
      return { ok: false };
    }

    const withLinks = await pageRepository.findWithLinks(page.id);
    const links = withLinks?.links || [];

    const profile = {
      displayName: user.displayName || undefined,
      avatarUrl: user.avatarUrl || undefined,
      bio: user.bio || undefined,
    };

    const username = user.username || undefined;
    const liveUrl = username ? `https://${username}.lynkby.com` : undefined;
    const fallbackUrl = username ? `https://lynkby.com/u/${username}` : undefined;

    return {
      ok: true,
      page: {
        id: page.id,
        layout: page.layout || "LINKS_LIST",
        theme: page.theme || "classic",
        published: page.published !== false,
        updatedAt: page.updatedAt,
        createdAt: page.createdAt,
      },
      profile,
      links: links.map(l => ({ id: l.id, title: l.title, url: l.url, active: l.active !== false, position: l.position })),
      liveUrl,
      fallbackUrl,
    };
  }

  async updateMyPage(userId: string, input: { displayName?: string; avatarUrl?: string; bio?: string; published?: boolean; layout?: string; theme?: string }): Promise<{ ok: boolean; error?: string }> {
    userRepository.setEnvironment(this.getEnv());
    pageRepository.setEnvironment(this.getEnv());
    
    const user = await userRepository.findById(userId);
    if (!user) return { ok: false, error: "User not found" };
    
    const page = await pageRepository.findByUserId(userId);
    if (!page) return { ok: false, error: "Page not found" };

    // Validate input fields
    if (input.displayName !== undefined) {
      const displayNameValidation = validateDisplayName(input.displayName);
      if (!displayNameValidation.isValid) {
        return { ok: false, error: displayNameValidation.error };
      }
    }

    if (input.bio !== undefined) {
      const bioValidation = validateBio(input.bio);
      if (!bioValidation.isValid) {
        return { ok: false, error: bioValidation.error };
      }
    }

    if (input.theme !== undefined) {
      const themeValidation = validateTheme(input.theme);
      if (!themeValidation.isValid) {
        return { ok: false, error: themeValidation.error };
      }
    }

    // Update user profile fields
    if (input.displayName !== undefined || input.avatarUrl !== undefined || input.bio !== undefined) {
      await userRepository.update(userId, {
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        bio: input.bio,
      });
    }

    // Update page fields
    if (input.published !== undefined || input.layout !== undefined || input.theme !== undefined) {
      await pageRepository.update(page.id, {
        published: input.published,
        layout: input.layout,
        theme: input.theme,
      });
    }

    return { ok: true };
  }

  async replaceMyLinks(userId: string, links: Array<{ id?: string; title?: string; label?: string; url: string; active?: boolean; position?: number; order?: number }>): Promise<{ ok: boolean; count: number; error?: string }> {
    pageRepository.setEnvironment(this.getEnv());
    const page = await pageRepository.findByUserId(userId);
    if (!page) return { ok: false, count: 0, error: "Page not found" };

    // Validate links count
    const linksCountValidation = validateLinksCount(links?.length || 0);
    if (!linksCountValidation.isValid) {
      return { ok: false, count: 0, error: linksCountValidation.error };
    }

    // Normalize and validate each link
    const normalized: Array<{ title: string; url: string; position: number; active: boolean }> = [];
    
    for (let i = 0; i < (links || []).length; i++) {
      const link = links[i];
      if (!link || (!link.title && !link.label) || !link.url) continue;

      const title = (link.title ?? link.label ?? '').toString().trim();
      const url = link.url.trim();

      // Validate title
      const titleValidation = validateLinkTitle(title);
      if (!titleValidation.isValid) {
        return { ok: false, count: 0, error: `Link ${i + 1}: ${titleValidation.error}` };
      }

      // Validate URL
      const urlValidation = validateUrl(url);
      if (!urlValidation.isValid) {
        return { ok: false, count: 0, error: `Link ${i + 1}: ${urlValidation.error}` };
      }

      normalized.push({
        title: title.slice(0, 80),
        url,
        position: link.position ?? link.order ?? i,
        active: link.active ?? true,
      });
    }

    const count = await pageRepository.replaceLinks(page.id, normalized);
    return { ok: true, count };
  }

  async publish(userId: string): Promise<{ ok: boolean }> {
    pageRepository.setEnvironment(this.getEnv());
    const page = await pageRepository.findByUserId(userId);
    if (!page) return { ok: false };
    // Ensure published and touch updatedAt
    await pageRepository.update(page.id, { published: true });
    return { ok: true };
  }
}

export const pagesService = new PagesService();