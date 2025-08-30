import { Hono } from 'hono';
import { cacheHTML, purgeUser } from './lib/cache';
import { fetchProfile, renderHTML } from './routes/page';
import type { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();

// Health
app.get('/_health', (c) => c.json({ ok: true }));

// Revalidate cache endpoint
app.get('/_revalidate', async (c) => {
  const secret = c.req.query('secret');
  const username = (c.req.query('username') || '').toLowerCase();
  if (!secret || secret !== c.env.REVALIDATE_SECRET) return c.json({ ok: false, error: 'unauthorized' }, 401);
  if (!username) return c.json({ ok: false, error: 'missing_username' }, 400);
  await purgeUser(c, username);
  return c.json({ ok: true, username });
});

// Render user page
app.get('/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const apiBase = c.env.API_BASE || 'http://localhost:8787';
  return cacheHTML(c, username, 300, async () => {
    const profile = await fetchProfile(apiBase, username);
    if (!profile) {
      return '<!doctype html><html><body style="font-family:ui-sans-serif,system-ui;text-align:center;padding:24px"><h1>Profile Not Found</h1><p style="opacity:.7">No profile for @' + username + '</p></body></html>';
    }
    return renderHTML(profile);
  });
});

export default app;

export const fetch = app.fetch;
