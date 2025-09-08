requirements spec for the wildcard public worker that serves creator pages at *.lynkby.com/*. This is the TikTok web-view first, ultra-fast, zero-JS renderer.

⸻

#️⃣ Name & Scope
	•	Worker name: edge-public
	•	Routes (Cloudflare > Workers > Routes):
	•	*.lynkby.com/* → edge-public (this spec)
	•	(Optional, same worker or a sibling): lynkby.com/u/* for path fallback
	•	Primary responsibility: SSR static HTML (no hydration/JS) for a creator’s public page using data from the API worker, with aggressive edge caching and TikTok web-view optimizations.

⸻

🎯 Goals & Non-Goals

Goals
	•	TTFB (edge cache hit): < 50 ms
	•	Total HTML transfer < 10 KB (Brotli)
	•	Zero external assets; inline CSS only; no JS
	•	Stable layout: CLS ~ 0
	•	Works inside TikTok’s in-app web-view
	•	Safe defaults (robust headers, input validation)

Non-Goals (MVP)
	•	No per-link click tracking (will arrive Week 5)
	•	No custom domains (only *.lynkby.com)
	•	No dynamic layout system (single layout; theming via CSS vars)

⸻

🧭 Routing & Username Resolution
	•	Accept only *.lynkby.com hostnames.
	•	Extract username as the left-most label(s) before lynkby.com.
	•	E.g., bobo.lynkby.com → username="bobo"
	•	Reject multi-dot usernames for MVP (e.g., john.doe.lynkby.com) → 404
	•	Reserved subdomains → 404:
	•	www, app, api, admin, support, blog, cdn, static, docs, pricing, status, dashboard, help, mail, dev, stage
	•	Allow only ^[a-z0-9_]{3,24}$ (lower-case); anything else → 404
	•	Path handling on subdomains:
	•	/ → render page
	•	Anything else (/robots.txt, /favicon.ico) → handled (see Utilities); all other paths → 404

⸻

🔌 Upstream Dependencies
	•	API base: https://api.lynkby.com/v1/public/page/by-username/:username
	•	200 → page payload
	•	404 → not found/unpublished
	•	No other networks (no fonts, no CSS, no JS CDNs).

Env Vars (bound in Worker)
	•	API_BASE="https://api.lynkby.com"
	•	RESERVED="www,app,api,admin,support,blog,cdn,static,docs,pricing,status,dashboard,help,mail,dev,stage"

⸻

📦 Data Contract (from API)

{
  "username": "bobo",
  "displayName": "Bobo",
  "avatarUrl": "https://...",
  "bio": "Short bio…",
  "page": {
    "layout": "LINKS_LIST",
    "theme": "classic",
    "published": true,
    "updatedAt": "2025-09-03T08:40:00Z"
  },
  "links": [
    { "title":"Twitter", "url":"https://x.com/...", "active":true, "position":0 },
    { "title":"Shop", "url":"https://shop.com", "active":true, "position":1 }
  ]
}

Worker validations
	•	displayName, bio, title must be treated as plain text → escape HTML.
	•	links: filter to active === true, sort by position.
	•	url allowlist schemes: https:, mailto:, tel: (drop otherwise).
	•	Empty lists → render nothing (no gaps).

⸻

🧠 Caching Strategy

Edge cache (Cache API)
	•	Cache key: GET https://{username}.lynkby.com/
	•	Cache headers on HTML response:
	•	cache-control: max-age=60, s-maxage=300, stale-while-revalidate=86400
	•	Staleness policy: Serve cached for 60s to browser, 300s to edge; allow SWR for a day.

Freshness hint / soft versioning
	•	Use page.updatedAt to embed a version in <meta name="x-page-ver" content="..."> for diagnostics.
	•	(Optional later) include ?v={timestamp} in the API GET to help observability; do not include in cache key.

API fetch
	•	cf: { cacheTtl: 0, cacheEverything: false } (don’t cache API response at CF layer; we cache the rendered HTML)

⸻

🖼️ HTML Rendering Rules (Zero-JS)

Layout
	•	Single column, centered, 360–420px, padding 24px.
	•	Inline CSS, system fonts only.
	•	Big tap targets (≥48px height); spacing 12–16px.

Theming (3 presets via CSS vars)
	•	classic (dark), contrast (light), warm (warm gray)
	•	Switch by adding data-theme="classic|contrast|warm" to <body> and setting CSS vars in a small :root block.

Accessibility
	•	Color contrast ≥ WCAG AA (≥ 4.5:1 for text).
	•	<img> with alt.
	•	Link focus outline visible.

SEO/OG (still minimal)
	•	<title>{displayName} | Lynkby</title>
	•	<meta name="description" content="{bio (truncated 160)}">
	•	OG tags: og:title, og:description, og:type=website
	•	Use avatarUrl as og:image only if same-origin or remote allows hotlinking; otherwise skip (MVP ok to include remote).

TikTok web-view specifics
	•	No external fonts (avoid FOIT).
	•	<meta name="format-detection" content="telephone=no">
	•	All links use target="_blank" rel="noopener" (TikTok opens in-app; noopener prevents access).
	•	No scripts, no iframes.

Example (structure)

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="format-detection" content="telephone=no">
  <title>{{displayName}} | Lynkby</title>
  <meta name="description" content="{{bio160}}">
  <meta property="og:title" content="{{displayName}} on Lynkby">
  <meta property="og:description" content="{{bio160}}">
  {{#if ogImage}}<meta property="og:image" content="{{ogImage}}">{{/if}}
  <meta name="x-page-ver" content="{{updatedAt}}">
  <link rel="icon" href="data:,">
  <style>/* ~1.5–2.5KB inline CSS; see CSS spec below */</style>
</head>
<body data-theme="{{theme}}">
  <main class="wrap">
    <section class="center">
      {{#if avatarUrl}}<img class="avatar" src="{{avatarUrl}}" alt="{{displayName}}"/>{{/if}}
      <h1 class="name">{{displayName}}</h1>
      {{#if bio}}<p class="bio">{{bio}}</p>{{/if}}
    </section>
    <nav>
      {{#each links}}
        {{#if active}}<a class="btn" href="{{url}}" target="_blank" rel="noopener">{{title}}</a>{{/if}}
      {{/each}}
    </nav>
    <footer class="foot">Made with Lynkby</footer>
  </main>
</body>
</html>

CSS spec (inline)
	•	Use CSS variables for theme:
	•	--bg, --fg, --muted, --btn, --btnText, --radius
	•	Base
	•	body { background:var(--bg); color:var(--fg); font:16px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Arial; margin:0; }
	•	.wrap { max-width:420px; margin:0 auto; padding:24px 16px 64px; }
	•	.center { text-align:center; }
	•	.avatar { width:88px; height:88px; border-radius:50%; object-fit:cover; }
	•	.name { font-weight:700; font-size:22px; margin:12px 0 6px; }
	•	.bio { color:var(--muted); font-size:14px; margin:0 0 18px; }
	•	.btn { display:block; text-decoration:none; background:var(--btn); color:var(--btnText); border-radius:var(--radius); padding:14px 16px; margin:12px 0; text-align:center; font-weight:600; }
	•	.foot { margin-top:28px; opacity:.6; font-size:12px; text-align:center; }
	•	Themes
	•	[data-theme="classic"] { --bg:#0a0a0a; --fg:#f8f8f8; --muted:#b3b3b3; --btn:#1f1f1f; --btnText:#fff; --radius:12px; }
	•	[data-theme="contrast"] { --bg:#ffffff; --fg:#0c0c0c; --muted:#666; --btn:#f2f2f2; --btnText:#111; --radius:12px; }
	•	[data-theme="warm"] { --bg:#171513; --fg:#f5efe9; --muted:#c2b8ae; --btn:#2b2723; --btnText:#f5efe9; --radius:12px; }

⸻

🛡️ Security & Robustness

Input sanitization
	•	Validate host ends with .lynkby.com (case-insensitive).
	•	Username: regex ^[a-z0-9_]{3,24}$; check reserved list.
	•	404 for invalid or reserved.

Output escaping
	•	Escape displayName, bio, title for HTML.
	•	Truncate bio to 280 chars (160 for <meta>).
	•	Strip control characters.

Headers
	•	content-type: text/html; charset=utf-8
	•	x-content-type-options: nosniff
	•	referrer-policy: no-referrer
	•	frame-ancestors: 'none' (prevents clickjacking; note: our internal Preview overlay should load via same origin lynkby.com/u/:username route; this header applies to subdomain pages only.)
	•	permissions-policy: interest-cohort=()
	•	strict-transport-security: max-age=31536000; includeSubDomains; preload
	•	content-security-policy:

default-src 'none';
base-uri 'none';
img-src * data:;
style-src 'unsafe-inline';
connect-src 'none';
form-action 'none';
frame-ancestors 'none';
navigate-to *;

(No scripts at all.)

Rate limiting (light)
	•	Subdomain HTML: soft rate (e.g., allow bursts; CF edge usually fine). If needed, add IP token bucket per hostname (KV/DO not required for MVP).

Error handling
	•	404 page: tiny HTML (~1KB) with neutral message “Page not found”.
	•	5xx upstream → return cached version if present; else a 502 minimal page. Include cf-ray id in a footer comment for debugging.

⸻

📈 Observability

Response headers
	•	x-lynkby-username: {username}
	•	x-lynkby-cache: HIT|MISS (edge HTML cache)
	•	x-api-status: 200|404|5xx (last upstream status)
	•	x-page-ver: {updatedAt}

Sampling logs (10% sample)
	•	Log: { ts, ray, host, username, cache, apiStatus, durFetchMs, durRenderMs } via console.log (visible in CF Logs). Keep payload < 1KB.

⸻

🧪 Acceptance Tests
	1.	Valid username:
	•	bobo.lynkby.com/ returns 200, renders name, links.
	•	Headers include security & cache headers.
	•	No external requests after initial HTML (DevTools “requests = 1”).
	2.	Reserved:
	•	www.lynkby.com/ returns 404 (for this worker; the apex is served elsewhere).
	3.	Invalid username:
	•	BOBO.lynkby.com/ → case normalized; if not allowed by regex → 404.
	4.	Empty content:
	•	If user has 0 active links → renders header + footer only (no empty artifacts).
	5.	Cache behavior:
	•	First request: x-lynkby-cache: MISS
	•	Repeat within 60s: HIT and TTFB < 50ms (near your chosen edge POP).
	6.	Update propagation:
	•	After editor Save/Publish (API bumps updatedAt), live page shows new content within ≤ 60s (browser) / ≤ 5 min (edge), per headers.
	7.	TikTok web-view:
	•	Open via TikTok in-app browser: fonts are system, layout stable, links open without blocking (target=_blank, noopener).
	8.	Security:
	•	CSP blocks any <script> injection attempts (manually modify HTML locally to test).
	•	XSS attempt via title="<img onerror=alert(1)>” renders escaped text, not HTML.

⸻

⚙️ Pseudocode (Worker)

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const host = url.hostname.toLowerCase();

    if (!host.endsWith(".lynkby.com")) return notFound();

    // Only root path on subdomain is supported
    if (url.pathname !== "/" && url.pathname !== "/robots.txt" && url.pathname !== "/favicon.ico")
      return notFound();

    if (url.pathname === "/robots.txt") return robots();
    if (url.pathname === "/favicon.ico") return tinyFavicon(); // data uri or 204

    const username = extractUsername(host);
    if (!username || isReserved(username, env)) return notFound();

    const cache = caches.default;
    const cacheKey = new Request(`https://${host}/`, { method: "GET" });

    const cached = await cache.match(cacheKey);
    if (cached) return withStdHeaders(cached, { cache: "HIT", username });

    // Miss → fetch API
    const apiUrl = `${env.API_BASE}/v1/public/page/by-username/${encodeURIComponent(username)}`;
    const t0 = Date.now();
    const apiRes = await fetch(apiUrl, { cf: { cacheTtl: 0, cacheEverything: false }});
    const apiStatus = apiRes.status;
    if (apiStatus !== 200) return notFound({ username, apiStatus });

    const data = await apiRes.json();
    const html = renderHtml(data); // escape fields, apply theme, build buttons

    const res = new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "max-age=60, s-maxage=300, stale-while-revalidate=86400",
        ...securityHeaders(data.page?.updatedAt)
      }
    });

    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return withStdHeaders(res, { cache: "MISS", username, apiStatus });
  }
};


⸻

🧩 Utilities to Implement
	•	extractUsername(host: string): string | null
	•	isReserved(name: string, env): boolean
	•	escapeHtml(s: string): string
	•	truncate(s: string, n: number): string
	•	securityHeaders(updatedAt?: string): Record<string,string>
	•	withStdHeaders(res: Response, meta: {cache:string, username:string, apiStatus?:number})
	•	Adds x-lynkby-username, x-lynkby-cache, x-api-status, x-page-ver
	•	robots() → allow all (User-agent: *\nAllow: /\n)
	•	tinyFavicon() → 204 No Content or tiny data URI
	•	notFound(meta?) → minimal HTML + appropriate headers

⸻

🚀 Performance Budget Checklist
	•	Inline CSS ≤ 2.5 KB (Brotli)
	•	HTML total ≤ 10 KB (Brotli)
	•	No blocking fonts / JS
	•	s-maxage ≥ 300s at edge; max-age ≥ 60s for browsers
	•	Images unmodified (hotlink OK for MVP). If avatars cause slowness later, add an image proxy with resizing in a separate worker.

⸻

📝 Future Hooks (Backlog)
	•	Click tracking via <a ping="/t"> (no JS) + single /t endpoint (rate-limited)
	•	Per-username purge endpoint signed with HMAC (when you want instant invalidation)
	•	Card/Grid layout (Week 6) toggled via page.layout
	•	OG image generator worker (R2/KV cached images)
	•	Custom domains (CNAME to apex) with HTTP challenge handling

⸻

This is everything you need to implement the *.lynkby.com/* worker cleanly, safely, and fast for TikTok’s web-view—while leaving room for analytics and pro layouts later without re-architecting.


-----

The preview in the dashboard must render the exact same HTML as the public page. Here’s a clean way to guarantee 1:1 parity without copy-pasting templates (and with instant, cache-proof preview).

Plan: Single Source of Truth Renderer

1) Create a shared renderer package
	•	Workspace package: packages/public-renderer
	•	Export:

export type PublicPageData = {
  username: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  page: { layout: 'LINKS_LIST'; theme: 'classic'|'contrast'|'warm'; published: boolean; updatedAt?: string }
  links: Array<{ title: string; url: string; active: boolean; position: number }>
}

export type RenderOptions = {
  // Controls CSP/frame policy differences between public page vs embedded preview
  mode: 'public' | 'embed'
  // Optional: used in diagnostics/meta
  requestHost?: string
}

export function renderHtml(data: PublicPageData, opts: RenderOptions): string
export function escapeHtml(s?: string, maxLen?: number): string


	•	Responsibilities:
	•	Build the full zero-JS HTML string (inline CSS, meta/OG, theme vars).
	•	Escape all user content (displayName, bio, link titles).
	•	Apply identical structure/styles for both public and preview.
	•	Accept mode to slightly adjust security headers (see below), not markup.

Used by:
	•	edge-public worker (*.lynkby.com/*)
	•	Dashboard (for server-rendered preview endpoint) OR the root worker (lynkby.com/preview/*)

This eliminates divergence and guarantees pixel parity.

⸻

2) Headers & Embedding (CSP/frame-ancestors)

Your current public worker (subdomains) sets:
	•	frame-ancestors: 'none'  ➜ Good for public, but blocks preview if you iframe it.

Solution:
	•	Keep public subdomain strict.
	•	Add a dedicated preview endpoint on the root domain that relaxes only the frame policy:
	•	frame-ancestors: 'self' https://app.lynkby.com
	•	Or, if you insist on reusing the subdomain, support a strictly internal query flag:
	•	?embed=1&sig=<HMAC> ➜ When valid, return headers for embedding.
	•	Safer to keep preview on the root domain to avoid loosening subdomain security.

Header sets:

Public (subdomain, cacheable):

content-type: text/html; charset=utf-8
cache-control: max-age=60, s-maxage=300, stale-while-revalidate=86400
x-content-type-options: nosniff
referrer-policy: no-referrer
strict-transport-security: max-age=31536000; includeSubDomains; preload
content-security-policy:
  default-src 'none';
  base-uri 'none';
  img-src * data:;
  style-src 'unsafe-inline';
  connect-src 'none';
  form-action 'none';
  frame-ancestors 'none';
  navigate-to *;

Embed (root preview, non-cache or private cache):

content-type: text/html; charset=utf-8
cache-control: no-store   // or very small max-age to reflect drafts
x-content-type-options: nosniff
referrer-policy: no-referrer
strict-transport-security: max-age=31536000; includeSubDomains; preload
content-security-policy:
  default-src 'none';
  base-uri 'none';
  img-src * data:;
  style-src 'unsafe-inline';
  connect-src 'none';
  form-action 'none';
  frame-ancestors 'self' https://app.lynkby.com;
  navigate-to *;


⸻

3) Preview Architecture (identical HTML, instant)

Option A (recommended): Root preview endpoint
	•	Route: lynkby.com/preview/:username
	•	Who serves it: the same edge worker (or a sibling) on the root domain.
	•	Data source: draft data from a private API (/v1/me/page/preview/:username) with dashboard auth → the worker calls API with a short-lived bearer provided by the dashboard (or a worker-to-API service token).
	•	Cache: no-store (always fresh so the editor shows instant changes).
	•	Headers: embed mode (see above).
	•	Dashboard UI: iframe https://lynkby.com/preview/${username}?t=${Date.now()} (the t busts any intermediary caches if present).

Option B: Subdomain with signed embed
	•	Route: https://{username}.lynkby.com/?embed=1&sig=...
	•	Signature: HMAC over {username}.{ts} with a shared secret (sig=hex(hmacSHA256(secret, payload)), ts<=60s)
	•	Headers: embed mode only when signature valid; else public mode.
	•	Risk: mixing public and private concerns on subdomain. Option A is cleaner.

⸻

4) Data: “Draft vs Published”

For preview to reflect unsaved or just-saved (but not yet cached) changes:
	•	API additions:
	•	GET /v1/me/page/preview/:username (auth required): returns exactly the same JSON shape as public, but from draft state (editor buffer) or the latest saved DB state (no publication check, no filtering).
	•	The renderer doesn’t care; it only needs the same contract.
	•	Editor flow:
	•	On each save, update DB and show preview iframe. No cache delays, because preview uses draft endpoint and no-store.
	•	Public page remains cache-friendly, updates visible within ~60s per your current policy.

⸻

5) Worker wiring (who calls the renderer)

edge-public (subdomains)
	•	Extract username
	•	Fetch public API JSON
	•	Call renderHtml(data, { mode: 'public', requestHost: host })
	•	Return HTML + public headers
	•	Cache HTML at edge (as you already do)

root preview (dashboard iframe)
	•	Validate user session (cookie/JWT → either verified in the API or via worker → API)
	•	Fetch preview API JSON (auth)
	•	Call renderHtml(data, { mode: 'embed', requestHost: host })
	•	Return HTML + embed headers
	•	cache-control: no-store

The markup & CSS are identical, only headers and data source differ.

⸻

6) Parity Guardrails (tests)
	•	Golden snapshot test in packages/public-renderer:
	•	Feed a fixed PublicPageData fixture
	•	Assert produced HTML snapshot (CI fails on unintended changes)
	•	Visual diff (optional): render the same HTML in a headless browser (Playwright) and screenshot both endpoints (/preview and subdomain mock); fail if pixels differ by > 1–2%.
	•	Contract test: Both endpoints must produce identical <body> innerHTML for the same input payload (strip <head> if meta differs only in CSP).

⸻

7) Dashboard integration details
	•	Editor preview container: 375×667 px, border-radius 16, shadow; on desktop center it; on mobile make it full-width with max-height and scroll.
	•	Preview refresh triggers:
	•	After successful save → refresh iframe src with updated ?t=${Date.now()}
	•	Manual “Refresh Preview” icon in the preview toolbar (helpful during theme tweaks)
	•	Fallback text: if preview load fails, show a tiny alert with a “Open live page” link.

⸻

8) Acceptance Criteria
	•	packages/public-renderer is the only source of HTML/CSS for public pages and preview.
	•	*.lynkby.com and lynkby.com/preview/:username produce identical markup for the same data (checked via tests).
	•	Preview loads instantly after save (no cache delay).
	•	Public page keeps fast caching; updates appear within your 60s window.
	•	Public pages cannot be embedded (frame-ancestors 'none'), preview can be embedded by the dashboard only.
	•	No external assets, no JS; HTML payload ≤ 10KB (brotli), CSS ≤ 2.5KB.
	•	All user strings are HTML-escaped in one place (renderer).
	•	Both endpoints pass the same accessibility/contrast checks.

⸻

9) Minimal code skeletons

Renderer (package)

// packages/public-renderer/src/index.ts
export function renderHtml(data: PublicPageData, opts: RenderOptions): string {
  const esc = (s?: string, n?: number) => escapeHtml(s, n)
  const theme = data.page?.theme ?? 'classic'
  const updatedAt = data.page?.updatedAt ?? ''
  const safeLinks = (data.links ?? [])
    .filter(l => l?.active)
    .sort((a,b) => (a.position ?? 0) - (b.position ?? 0))
    .filter(l => /^https:|^mailto:|^tel:/.test(l.url || ''))

  // … build identical HTML with inline CSS (same as your public worker spec) …
  return `<!doctype html>...`
}

Public worker uses it

import { renderHtml } from '@lynkby/public-renderer'

const html = renderHtml(data, { mode: 'public', requestHost: host })

Preview endpoint uses it

import { renderHtml } from '@lynkby/public-renderer'

const html = renderHtml(data, { mode: 'embed', requestHost: host })


⸻

This setup keeps your preview and production perfectly in lock-step forever, while still honoring the different security and caching needs of each surface.