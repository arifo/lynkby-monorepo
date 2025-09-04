end-to-end implementation spec for what happens immediately after username creation:

⸻

✅ Scope
	•	Auto-create a default page for every new user.
	•	Serve live pages on https://{username}.lynkby.com (and canonical fallback https://lynkby.com/u/{username}).
	•	One simple layout (Links List) for MVP.
	•	API Worker handles all CRUD and onboarding init.
	•	Edge Worker renders public pages, handles subdomain routing, caching, and preview.

⸻

1) Data Model (Prisma)

// users are already created by auth; add the fields below if missing
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  displayName  String?
  avatarUrl    String?
  bio          String?  @db.VarChar(280)
  plan         Plan     @default(FREE) // FREE | PRO
  page         Page?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum Plan {
  FREE
  PRO
}

model Page {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  layout        Layout   @default(LINKS_LIST) // LINKS_LIST only for MVP
  theme         String   @default("classic")  // preset name; 2–3 presets in MVP
  published     Boolean  @default(true)
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())
  // handy counters for simple analytics later
  viewsAllTime  Int      @default(0)
}

enum Layout {
  LINKS_LIST
}

model Link {
  id        String   @id @default(cuid())
  pageId    String
  page      Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)
  title     String   @db.VarChar(80)
  url       String   @db.VarChar(2048)
  active    Boolean  @default(true)
  position  Int      // 0,1,2… for ordering
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([pageId, position])
}

Business rules
	•	username is lowercase, [a-z0-9_], 3–24 chars, case-insensitive unique.
	•	Reserved usernames (block list): www, app, api, admin, support, blog, cdn, static, docs, pricing, status, dashboard, help, mail, dev, stage etc.
	•	1 page per user for MVP (enforced by Page.userId @unique).
	•	Default content on page creation:
	•	Links:
	1.	“👋 Welcome to my Lynkby” → https://lynkby.com
	2.	“💡 Example link” → https://example.com
	•	These show the user what it will look like and are easy to replace.

⸻

2) API Worker (private + public JSON)

Base URL: https://api.lynkby.com/v1

Auth
	•	Use your existing session/JWT from magic link/OTP.
	•	Private endpoints require Authorization: Bearer <token>.

Endpoints

2.1 POST /setup/page

Idempotent. Creates the default page and two default links if the user has no page yet.

Req: (auth required)
{}

Res 200:

{
  "pageId": "pg_...",
  "username": "bobo",
  "liveUrl": "https://bobo.lynkby.com",
  "fallbackUrl": "https://lynkby.com/u/bobo"
}

Logic:
	•	If Page exists → return existing (no duplicate).
	•	Else create:
	•	Page { layout: LINKS_LIST, theme: "classic", published: true }
	•	Link[] with two defaults (positions 0,1).

⸻

2.2 GET /me/page

Returns the current user’s page + links (for dashboard editor).

Res 200:

{
  "page": {
    "id": "pg_...",
    "layout": "LINKS_LIST",
    "theme": "classic",
    "published": true,
    "updatedAt": "2025-09-03T08:40:00Z"
  },
  "profile": {
    "displayName": "Bobo",
    "avatarUrl": "https://...",
    "bio": "..."
  },
  "links": [
    {"id":"lnk1","title":"👋 Welcome to my Lynkby","url":"https://lynkby.com","active":true,"position":0},
    {"id":"lnk2","title":"💡 Example link","url":"https://example.com","active":true,"position":1}
  ],
  "liveUrl": "https://bobo.lynkby.com",
  "fallbackUrl": "https://lynkby.com/u/bobo"
}


⸻

2.3 PUT /me/page

Update page meta + profile (NOT links).
Req:

{
  "displayName": "string?",
  "avatarUrl": "string?",
  "bio": "string?",
  "layout": "LINKS_LIST",   // MVP only
  "theme": "classic",       // one of preset names
  "published": true
}

Res 200: { "ok": true }

⸻

2.4 POST /me/links/bulk-upsert

Replace the entire links array in one shot (best for simple editor).

Req:

{
  "links": [
    { "id": "lnk1", "title": "Twitter", "url": "https://x.com/...", "active": true, "position": 0 },
    { "title": "Shop", "url": "https://myshop.com", "active": true, "position": 1 } // new link (no id)
  ]
}

Rules:
	•	Server normalizes positions to 0..n in order received.
	•	Validates URL (must be https:// except phone/mailto).
	•	Max 50 links (MVP); future plan: unlimited on Pro.

Res 200: { "ok": true, "count": 12 }

⸻

2.5 POST /me/publish

Soft “publish” action (no diff yet, but good hook to bump cache).
Res 200: { "ok": true }

Server side:
	•	Update Page.updatedAt = now().
	•	Emit a background event (optional) for analytics.

⸻

2.6 GET /public/page/by-username/:username

Public JSON for Edge Worker to render.

Res 200:

{
  "username": "bobo",
  "displayName": "Bobo",
  "avatarUrl": "https://...",
  "bio": "Short bio up to 280 chars",
  "page": { "layout":"LINKS_LIST", "theme":"classic", "published":true, "updatedAt":"2025-09-03T08:40:00Z" },
  "links": [
    {"title":"Twitter","url":"https://x.com/...","active":true,"position":0},
    {"title":"Shop","url":"https://shop.com","active":true,"position":1}
  ]
}

Res 404: { "error": "NOT_FOUND" } (also for unpublished).

⸻

2.7 (Optional for later) POST /public/track
	•	Minimal anonymous events { type: "page_view" | "link_click", username, linkIndex? }
	•	Rate-limit per IP.

⸻

3) Edge Worker (public pages, subdomain routing, caching)

Routes (Cloudflare Workers → Routes):
	•	lynkby.com/* → Edge Worker
	•	*.lynkby.com/* → Edge Worker
	•	app.lynkby.com/* → (Pages/Next.js dashboard as you already set)
	•	api.lynkby.com/* → API Worker

DNS:
	•	One wildcard DNS record *.lynkby.com proxied (orange cloud).
	•	Apex lynkby.com proxied, too.
	•	No per-username DNS needed; the worker resolves dynamically.

Request handling (pseudocode)

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const host = url.hostname;            // e.g., "bobo.lynkby.com"
    const isRoot = host === "lynkby.com" || host === "www.lynkby.com";

    // 1) Static assets / robots
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\n", { headers: { "content-type":"text/plain" }});

    // 2) Fallback path-based user pages: lynkby.com/u/{username}
    if (isRoot && url.pathname.startsWith("/u/")) {
      const username = url.pathname.split("/")[2]?.toLowerCase();
      return renderUserPage(username, env, req);
    }

    // 3) Subdomain-based user pages: {username}.lynkby.com
    const parts = host.split(".");
    if (parts.length >= 3 && parts[parts.length-2] === "lynkby" && parts[parts.length-1] === "com") {
      const username = parts.slice(0, parts.length - 2).join(".").toLowerCase();
      return renderUserPage(username, env, req);
    }

    // 4) Marketing site (root) → pass-through or static HTML
    return renderMarketingLanding(); // ultra-light HTML or redirect to www
  }
}

async function renderUserPage(username, env, req) {
  if (!username || isReserved(username)) return notFound();

  const cache = caches.default;
  const cacheKey = new Request(new URL("/", `https://${username}.lynkby.com`).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const apiUrl = `${env.API_BASE}/v1/public/page/by-username/${encodeURIComponent(username)}`;
  const apiRes = await fetch(apiUrl, { cf: { cacheTtl: 0, cacheEverything: false }});
  if (apiRes.status !== 200) return notFound();
  const data = await apiRes.json();

  const html = renderHtml(data); // SSR template string (see below)
  const res = new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Fast edge + safe freshness:
      "cache-control": "max-age=60, s-maxage=60, stale-while-revalidate=86400"
    }
  });

  // put in edge cache
  await cache.put(cacheKey, res.clone());
  return res;
}

Invalidation approach (MVP): Keep TTL 60s (max-age=60, s-maxage=60). When the user hits Publish or Save, you don’t need hard purge—new content is visible within a minute. Later you can add a versioned cache key (e.g., ?v=updatedAt).

HTML renderer (ultra-light, TikTok-friendly)
	•	No external CSS, system fonts, inline CSS only, large tap targets.
	•	360–420px content width, 16px base size, 48–56px link buttons.
	•	Minimal CLS (avoid web fonts), lazy-load avatar, OG meta.

<!-- renderHtml(data) -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{{displayName}} | Lynkby</title>
  <meta property="og:title" content="{{displayName}} on Lynkby">
  <meta property="og:description" content="{{bio}}">
  <meta property="og:type" content="website">
  <link rel="icon" href="data:,">
  <style>
    :root { --bg:#0a0a0a; --fg:#f8f8f8; --muted:#b3b3b3; --btn:#1f1f1f; --bd:12px; }
    body { margin:0; background:var(--bg); color:var(--fg); font: 16px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial; }
    .wrap { max-width:420px; margin:0 auto; padding:24px 16px 64px; }
    .center { text-align:center; }
    .avatar { width:88px; height:88px; border-radius:50%; object-fit:cover; }
    .name { font-weight:700; font-size:22px; margin:12px 0 6px; }
    .bio { color:var(--muted); font-size:14px; margin-bottom:18px; }
    .btn { display:block; text-decoration:none; color:var(--fg); background:var(--btn); border-radius:var(--bd);
           padding:14px 16px; margin:12px 0; text-align:center; font-weight:600; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="center">
      {{#if avatarUrl}}<img class="avatar" src="{{avatarUrl}}" alt="{{displayName}}"/>{{/if}}
      <div class="name">{{displayName}}</div>
      {{#if bio}}<div class="bio">{{bio}}</div>{{/if}}
    </section>
    <nav>
      {{#each links}}
        {{#if active}}<a class="btn" href="{{url}}" rel="noopener" target="_blank">{{title}}</a>{{/if}}
      {{/each}}
    </nav>
  </main>
</body>
</html>


⸻

4) Dashboard UI (first session after username)

Route: app.lynkby.com/dashboard

First-time state (after /setup/page)
	•	Success bar: “Your page is live → https://{username}.lynkby.com [Copy] [Open]”
	•	Profile Card
	•	Avatar URL (paste only in Week 1)
	•	Display Name
	•	Bio (max 280)
	•	Links Editor
	•	List rows: Title, URL, toggle (Active), drag handle (later), delete
	•	“Add Link” primary action → appends new row at bottom
	•	Theme (MVP)
	•	Radio: classic, contrast, warm (FREE)
	•	Publish bar
	•	“Save” (primary)
	•	“View live”
	•	Info text: “Changes appear within ~60s”

Detailed UX
	•	Validation:
	•	Title required, 1–80 chars.
	•	URL must be valid https:// (allow mailto: tel:).
	•	Errors inline under field.
	•	Optimistic UI (local reorder), server normalizes positions.

Copy CTA
	•	“Copy your link in bio” → copies https://{username}.lynkby.com

Preview mode
	•	Toggle “Preview (TikTok)” → constrains viewport to 375×667 container with the same HTML theme (iframe calling lynkby.com/u/{username}).

⸻

5) Business Logic & Flow

Post-Username creation (client app flow)
	1.	Client calls POST /v1/setup/page.
	2.	API returns live & fallback URLs.
	3.	Dashboard shows the default editor state with 2 prefilled links.
	4.	On every Save:
	•	PUT /v1/me/page (profile/meta)
	•	POST /v1/me/links/bulk-upsert (links)
	•	(Optional) POST /v1/me/publish (bumps updatedAt; future cache versioning hook)
	5.	User clicks View live → opens https://{username}.lynkby.com.

Public serving
	•	Edge Worker:
	•	Subdomain or /u/{username} path.
	•	Fetches /v1/public/page/by-username/:username.
	•	Renders inline HTML.
	•	Caches for 60s (stale-while-revalidate 1 day).

Reserved / not found
	•	If user hits an unavailable username subdomain → minimal 404 page.

⸻

6) Validation & Security
	•	Username policy enforced at creation & on every request that uses username to fetch.
	•	Public endpoint only returns when Page.published = true.
	•	Rate limit GET /public/... (per IP) at Worker level (e.g., 1000 req / 5 min).
	•	CORS: Public endpoints allow GET from anywhere; private endpoints → same origin (dashboard) only.
	•	XSS: Escape displayName, bio, title (no HTML allowed).
	•	URLs: Server-side sanitize & allowlist schemes.

⸻

7) Cloudflare & Env

Edge Worker env:
	•	API_BASE = "https://api.lynkby.com"
	•	(Optional) MARKETING_HTML embedded or static pass-through

API Worker env:
	•	DATABASE_URL (Neon pooled via Hyperdrive for runtime)
	•	DIRECT_URL (Neon direct for migrations)
	•	JWT_PUBLIC_KEY / session secret
	•	ALLOWED_ORIGINS = "https://app.lynkby.com"

Routes (Workers):
	•	Edge Worker: lynkby.com/*, *.lynkby.com/*
	•	API Worker: api.lynkby.com/*

Neon + Prisma
	•	Run migrations locally against DIRECT_URL.
	•	Worker runtime uses pooled DATABASE_URL (Hyperdrive) for scalability.

⸻

8) Acceptance Criteria (MVP)
	•	New user finishes username → /setup/page auto-creates a page with 2 links.
	•	https://{username}.lynkby.com is reachable within seconds (wildcard subdomain; no per-user DNS).
	•	https://lynkby.com/u/{username} shows identical content.
	•	Dashboard editor can:
	•	Update displayName, avatarUrl, bio
	•	Add/remove/toggle/reorder links (positions normalized)
	•	Save without errors; invalid fields show clear messages
	•	Copy live URL
	•	Edge page loads < 100ms TTFB at the edge (after cached) and minimal CLS.
	•	HTML is self-contained (no blocking external assets).
	•	Cache freshness: content updates visible within ≤60s.
	•	Reserved usernames 404 on subdomain.
	•	Public JSON hides unpublished pages.

⸻

9) Nice-to-have (keep in backlog)
	•	Hard cache purge endpoint (HMAC-signed) that deletes caches for a username.
	•	“Copy in 1 tap” deep link for TikTok app (with UTM).
	•	Link click tracking endpoint with per-IP debounce (for Week 5).
	•	Card/Grid layout (gated for Pro).
	•	Theme editor (Week 6).

⸻
