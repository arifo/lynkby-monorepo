import { z } from 'zod';
import type { Profile } from '@lynkby/shared/index';

const PublicProfileSchema = z.object({
  ok: z.literal(true),
  profile: z.object({
    username: z.string(),
    displayName: z.string(),
    bio: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    links: z.array(z.object({ label: z.string(), url: z.string().url() }))
  })
});

export async function fetchProfile(apiBase: string, username: string): Promise<Profile | null> {
  // Use the v1 pages endpoint (legacy /api also exists but v1 is canonical)
  const url = `${apiBase}/v1/pages/${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const parsed = PublicProfileSchema.safeParse(data);
  return parsed.success ? (parsed.data.profile as Profile) : null;
}

export function renderHTML(p: Profile): string {
  const links = (p.links || []).map((l: Profile['links'][number]) => `<a href="${l.url}" target="_blank" rel="noreferrer" style="padding:12px 16px;border-radius:12px;border:1px solid #e5e7eb;text-decoration:none;display:block">${l.label}</a>`).join('');
  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
    <title>${p.displayName} — Lynkby</title>
    <link rel="canonical" href="https://${p.username}.lynkby.com" />
    <style>body{font-family:ui-sans-serif, system-ui;padding:16px;max-width:460px;margin:0 auto;text-align:center}</style>
  </head>
  <body>
    ${p.avatarUrl ? `<img src="${p.avatarUrl}" alt="" width="96" height="96" style="border-radius:9999px" />` : ''}
    <h1 style="margin-top:12px;margin-bottom:8px">@${p.username}</h1>
    ${p.bio ? `<p style="opacity:.8;margin-bottom:16px">${p.bio}</p>` : ''}
    <div style="display:grid;gap:10px">${links}</div>
    <p style="margin-top:24px;font-size:12px;opacity:.6">Powered by Lynkby</p>
  </body>
  </html>`;
}
