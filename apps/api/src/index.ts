import { Hono } from "hono";

type Profile = {
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  links: { label: string; url: string; order: number }[];
};

type Env = { APP_API_BASE?: string; REVALIDATE_SECRET?: string };

// Define the response type from the app API
type AppResponse =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

const app = new Hono<{ Bindings: Env }>();

const RESERVED = new Set(["", "www", "app", "api", "static", "cdn", "help", "admin", "status", "docs"]);

// Health endpoint for uptime checks
app.get("/_health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// Public read-only API endpoint for profile data
app.get("/api/public/page", async (c) => {
  const username = (c.req.query("username") || "").toLowerCase();
  if (!username || RESERVED.has(username)) return c.json({ ok: false, error: "bad_username" }, 400);

  const base = c.env?.APP_API_BASE || "http://localhost:3001";
  try {
    const upstream = await fetch(`${base}/api/page/get?username=${encodeURIComponent(username)}`, {
      headers: { accept: "application/json" },
    });
    if (!upstream.ok) return c.json({ ok: false, error: "not_found" }, 404);
    const data = await upstream.json() as AppResponse;
    if (!data?.ok || !data?.profile) return c.json({ ok: false, error: "not_found" }, 404);

    const res = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=60",
        "Access-Control-Allow-Origin": "*", // public read-only
        "X-Cache": "MISS",
      },
    });
    // Cache JSON too
    const cache = (caches as any).default;
    c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()));
    return res;
  } catch {
    return c.json({ ok: false, error: "server_error" }, 500);
  }
});

// Revalidate endpoint: purge a username's cached HTML
// Usage: /_revalidate?username=testuser&secret=YOUR_SECRET
app.get("/_revalidate", async (c) => {
  const secret = c.req.query("secret") || "";
  if (!c.env.REVALIDATE_SECRET || secret !== c.env.REVALIDATE_SECRET) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }
  const username = (c.req.query("username") || "").toLowerCase();
  if (!username || RESERVED.has(username)) {
    return c.json({ ok: false, error: "bad_username" }, 400);
  }

  // Construct the canonical cache key for this username page
  const url = new URL(`https://${username}.lynkby.com/`);
  const cache = (caches as any).default;
  const deleted = await cache.delete(new Request(url.toString(), { method: "GET", headers: { host: `${username}.lynkby.com` } }));
  return c.json({ ok: true, deleted });
});

// Generate HTML for profile display
function generateProfileHTML(profile: Profile): string {
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"/>
<title>${profile.displayName} — Lynkby</title>
<link rel="canonical" href="https://${profile.username}.lynkby.com" />
<body style="font-family: ui-sans-serif, system-ui; margin:0; padding:16px; display:grid; place-items:center;">
  <main style="width:min(460px,100%); text-align:center;">
    ${profile.avatarUrl ? `<img src="${profile.avatarUrl}" alt="" width="96" height="96" style="border-radius:9999px"/>` : ""}
    <h1 style="margin:12px 0">@${profile.username}</h1>
    ${profile.bio ? `<p style="opacity:.8;margin-bottom:16px">${profile.bio}</p>` : ""}
    <div style="display:grid;gap:10px">
      ${profile.links
        .map(
          (l) => `
        <a href="${l.url}" target="_blank" rel="noopener noreferrer" style="padding:12px 16px; border:1px solid #e5e7eb; border-radius:12px; text-decoration:none; display:block;">
          ${l.label}
        </a>`
        )
        .join("")}
    </div>
    <p style="margin-top:24px;font-size:12px;opacity:.6">Served from Cloudflare API • ${new Date().toISOString()}</p>
  </main>
</body>
</html>`;
}

app.get("*", async (c) => {
  const req = c.req.raw;
  const host = c.req.header("host") || "";
  const username = host.replace(".lynkby.com", "").toLowerCase();

  if (RESERVED.has(username)) return c.text("Reserved host", 404);

  // Cache key = full URL inc. hostname (unique per user)
  const cache = (caches as any).default;
  const cacheKey = new Request(new URL(req.url).toString(), req);

  // Try cache first
  let res = await cache.match(cacheKey);
  if (res) {
    // Add minimal safety headers even on cached hits
    res = new Response(res.body, {
      headers: new Headers({
        ...Object.fromEntries(res.headers),
        "X-Cache": "HIT",
      }),
      status: res.status,
      statusText: res.statusText,
    });
    return res;
  }

  // Prefer bound env (wrangler.toml [vars]) with a dev fallback
  const base = c.env?.APP_API_BASE || "http://localhost:3001";

  try {
    const upstream = await fetch(`${base}/api/page/get?username=${encodeURIComponent(username)}`, {
      headers: { accept: "application/json" },
    });

    if (!upstream.ok) return c.text("Profile not found", 404);

    const data = await upstream.json() as AppResponse;
    if (!data?.ok || !data?.profile) return c.json({ ok: false, error: "not_found" }, 404);

    const profile = data.profile;

    const html = generateProfileHTML(profile);

    // Security + cache headers
    const headers = new Headers({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=60",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "accelerometer=(), geolocation=(), microphone=()",
      "X-Cache": "MISS",
    });

    const response = new Response(html, { status: 200, headers });

    // Only cache successful HTML responses
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (err) {
    console.error("api render error", err);
    return c.text("Server error", 500);
  }
});

export default app;
