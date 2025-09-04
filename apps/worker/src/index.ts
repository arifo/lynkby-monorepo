import { Hono } from 'hono';
import { cacheHTML, purgeUser } from './lib/cache';
import { fetchProfile, renderHTML } from './routes/page';
import type { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();

// Health
app.get('/_health', (c) => c.json({ ok: true }));

// Robots.txt
app.get('/robots.txt', (c) => c.text('User-agent: *\nAllow: /\n'));

// Revalidate cache endpoint
app.get('/_revalidate', async (c) => {
  const secret = c.req.query('secret');
  const username = (c.req.query('username') || '').toLowerCase();
  if (!secret || secret !== c.env.REVALIDATE_SECRET) return c.json({ ok: false, error: 'unauthorized' }, 401);
  if (!username) return c.json({ ok: false, error: 'missing_username' }, 400);
  await purgeUser(c, username);
  return c.json({ ok: true, username });
});

function extractSubdomainUsername(host: string): string | null {
  // Expecting something like username.lynkby.com
  const RESERVED = new Set(['www','app','api','admin','support','blog','cdn','static','docs','pricing','status','dashboard','help','mail','dev','stage']);
  const parts = (host || '').split(':')[0].split('.');
  if (parts.length < 3) return null;
  const [sub] = parts;
  if (!sub || RESERVED.has(sub)) return null;
  return sub.toLowerCase();
}

async function renderUser(c: any, username: string) {
  const apiBase = c.env.API_BASE || 'http://localhost:8787';
  return cacheHTML(c, username, 300, async () => {
    const profile = await fetchProfile(apiBase, username);
    if (!profile) {
      return '<!doctype html><html><body style="font-family:ui-sans-serif,system-ui;text-align:center;padding:24px"><h1>Profile Not Found</h1><p style="opacity:.7">No profile for @' + username + '</p></body></html>';
    }
    return renderHTML(profile);
  });
}

// Serve subdomain root as profile
app.get('/', async (c) => {
  const host = new URL(c.req.url).host;
  const username = extractSubdomainUsername(host);
  if (!username) {
    // Return marketing landing for root domain
    return c.html(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lynkby</title><style>body{margin:0;font:16px/1.5 system-ui;-webkit-font-smoothing:antialiased;color:#111}main{max-width:720px;margin:10vh auto;padding:0 16px}a{color:#2563eb;text-decoration:none}</style><main><h1>Lynkby</h1><p>Create a beautiful link-in-bio in seconds.</p><p><a href="https://app.lynkby.com">Open Dashboard</a></p></main></html>`);
  }
  return renderUser(c, username);
});

// Serve /u/:username path variant
app.get('/u/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();
  return renderUser(c, username);
});

// Keep legacy /:username route (optional)
app.get('/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();
  // Avoid catching internal routes
  if (username.startsWith('_')) return c.notFound();
  return renderUser(c, username);
});

export default app;

export const fetch = app.fetch;
