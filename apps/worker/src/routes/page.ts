import { z } from 'zod';
import type { Profile } from '@lynkby/shared/index';

const PublicProfileSchema = z.object({
  username: z.string(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
  page: z.object({
    layout: z.string(),
    theme: z.string(),
    published: z.boolean(),
    updatedAt: z.string()
  }),
  links: z.array(z.object({ 
    title: z.string(), 
    url: z.string(), 
    active: z.boolean(), 
    position: z.number() 
  }))
});

export async function fetchProfile(apiBase: string, username: string): Promise<any | null> {
  // Use the v1 public page endpoint
  const url = `${apiBase}/v1/public/page/by-username/${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const parsed = PublicProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

function getThemeStyles(theme: string) {
  const themes = {
    classic: {
      bg: "#0a0a0a",
      fg: "#f8f8f8", 
      muted: "#b3b3b3",
      btn: "#1f1f1f",
      bd: "12px"
    },
    contrast: {
      bg: "#000000",
      fg: "#ffffff",
      muted: "#cccccc", 
      btn: "#ffffff",
      bd: "8px"
    },
    warm: {
      bg: "#1a1a1a",
      fg: "#f5f5dc",
      muted: "#d4af37",
      btn: "#2d2d2d",
      bd: "16px"
    }
  };
  
  const t = themes[theme as keyof typeof themes] || themes.classic;
  return `:root { --bg:${t.bg}; --fg:${t.fg}; --muted:${t.muted}; --btn:${t.btn}; --bd:${t.bd}; }`;
}

function escapeHtml(s?: string) {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderHTML(data: any): string {
  const { username, displayName, avatarUrl, bio, page, links } = data;
  const theme = page?.theme || "classic";
  const activeLinks = (links || []).filter((l: any) => l.active !== false);
  
  const buttons = activeLinks
    .map((l: any) => `<a class="btn" href="${encodeURI(l.url)}" rel="noopener" target="_blank">${escapeHtml(l.title)}</a>`) 
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(displayName || `@${username}`)} | Lynkby</title>
  <meta property="og:title" content="${escapeHtml(displayName || `@${username}`)} on Lynkby">
  <meta property="og:description" content="${escapeHtml(bio || '')}">
  <meta property="og:type" content="website">
  <link rel="icon" href="data:,">
  <style>
    ${getThemeStyles(theme)}
    body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial; }
    .wrap { max-width:420px; margin:0 auto; padding:24px 16px 64px; }
    .center { text-align:center; }
    .avatar { width:88px; height:88px; border-radius:50%; object-fit:cover; }
    .name { font-weight:700; font-size:22px; margin:12px 0 6px; }
    .bio { color:var(--muted); font-size:14px; margin-bottom:18px; }
    .btn { display:block; text-decoration:none; color:var(--fg); background:var(--btn); border-radius:var(--bd); padding:14px 16px; margin:12px 0; text-align:center; font-weight:600; }
    ${theme === 'contrast' ? '.btn { border: 2px solid var(--fg); }' : ''}
  </style>
  </head>
  <body>
    <main class="wrap">
      <section class="center">
        ${avatarUrl ? `<img class="avatar" src="${encodeURI(avatarUrl)}" alt="${escapeHtml(displayName || username)}"/>` : ""}
        <div class="name">${escapeHtml(displayName || `@${username}`)}</div>
        ${bio ? `<div class="bio">${escapeHtml(bio)}</div>` : ""}
      </section>
      <nav>
        ${buttons}
      </nav>
    </main>
  </body>
  </html>`;
}
