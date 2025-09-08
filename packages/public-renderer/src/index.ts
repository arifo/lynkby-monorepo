// Public page data types
export interface PublicPageData {
	username: string;
	displayName?: string;
	avatarUrl?: string;
	bio?: string;
	page: {
		layout: 'LINKS_LIST';
		theme: 'classic' | 'contrast' | 'warm';
		published: boolean;
		updatedAt?: string;
	};
	links: Array<{
		title: string;
		url: string;
		active: boolean;
		position: number;
	}>;
}

export interface RenderOptions {
	// Controls CSP/frame policy differences between public page vs embedded preview
	mode: 'public' | 'embed';
	// Optional: used in diagnostics/meta
	requestHost?: string;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(s?: string, maxLen?: number): string {
	if (!s) return '';
	
	let escaped = s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/\0/g, '')
		.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
	
	if (maxLen && escaped.length > maxLen) {
		escaped = escaped.substring(0, maxLen - 3) + '...';
	}
	
	return escaped;
}

/**
 * Truncate string to specified length
 */
export function truncate(s: string, n: number): string {
	if (s.length <= n) return s;
	return s.substring(0, n - 3) + '...';
}

/**
 * Generate security headers based on mode
 */
export function getSecurityHeaders(mode: 'public' | 'embed', updatedAt?: string): Record<string, string> {
	const baseHeaders = {
		'content-type': 'text/html; charset=utf-8',
		'x-content-type-options': 'nosniff',
		'referrer-policy': 'no-referrer',
		'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
		'permissions-policy': 'interest-cohort=()',
	};

	const csp = mode === 'public' 
		? [
			"default-src 'none'",
			"base-uri 'none'",
			"img-src * data:",
			"style-src 'unsafe-inline'",
			"connect-src 'none'",
			"form-action 'none'",
			"frame-ancestors 'none'"
		].join('; ')
		: [
			"default-src 'none'",
			"base-uri 'none'",
			"img-src * data:",
			"style-src 'unsafe-inline'",
			"connect-src 'none'",
			"form-action 'none'",
			"frame-ancestors 'self' https://app.lynkby.com"
		].join('; ');

	return {
		...baseHeaders,
		'content-security-policy': csp,
		...(updatedAt && { 'x-page-ver': updatedAt })
	};
}

/**
 * Generate cache headers based on mode
 */
export function getCacheHeaders(mode: 'public' | 'embed'): Record<string, string> {
	return mode === 'public' 
		? {
			'cache-control': 'max-age=60, s-maxage=300, stale-while-revalidate=86400'
		}
		: {
			'cache-control': 'no-store'
		};
}

/**
 * Render HTML for public pages
 */
export function renderHtml(data: PublicPageData, opts: RenderOptions): string {
	const esc = (s?: string, n?: number) => escapeHtml(s, n);
	const theme = data.page?.theme ?? 'classic';
	const updatedAt = data.page?.updatedAt ?? '';
	
	// Filter and sort active links
	const safeLinks = (data.links ?? [])
		.filter(l => l?.active)
		.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
		.filter(l => /^https:|^mailto:|^tel:/.test(l.url || ''));

	const displayName = esc(data.displayName);
	const bio = esc(data.bio, 280);
	const bioMeta = esc(data.bio, 160);
	const avatarUrl = data.avatarUrl;
	const ogImage = avatarUrl ? `  <meta property="og:image" content="${esc(avatarUrl)}">` : '';

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="format-detection" content="telephone=no">
  <title>${displayName} | Lynkby</title>
  <meta name="description" content="${bioMeta}">
  <meta property="og:title" content="${displayName} on Lynkby">
  <meta property="og:description" content="${bioMeta}">
  <meta property="og:type" content="website">
${ogImage}
  <meta name="x-page-ver" content="${esc(updatedAt)}">
  <link rel="icon" href="data:,">
  <style>
    :root {
      --bg: #0a0a0a;
      --fg: #f8f8f8;
      --muted: #b3b3b3;
      --btn: #1f1f1f;
      --btnText: #fff;
      --radius: 12px;
    }
    
    [data-theme="classic"] {
      --bg: #0a0a0a;
      --fg: #f8f8f8;
      --muted: #b3b3b3;
      --btn: #1f1f1f;
      --btnText: #fff;
      --radius: 12px;
    }
    
    [data-theme="contrast"] {
      --bg: #ffffff;
      --fg: #0c0c0c;
      --muted: #666;
      --btn: #f2f2f2;
      --btnText: #111;
      --radius: 12px;
    }
    
    [data-theme="warm"] {
      --bg: #171513;
      --fg: #f5efe9;
      --muted: #c2b8ae;
      --btn: #2b2723;
      --btnText: #f5efe9;
      --radius: 12px;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      background: var(--bg);
      color: var(--fg);
      font: 16px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    
    .wrap {
      max-width: 420px;
      margin: 0 auto;
      padding: 24px 16px 64px;
    }
    
    .center {
      text-align: center;
    }
    
    .avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 12px;
      display: block;
    }
    
    .name {
      font-weight: 700;
      font-size: 22px;
      margin: 12px 0 6px;
      line-height: 1.2;
    }
    
    .bio {
      color: var(--muted);
      font-size: 14px;
      margin: 0 0 18px;
      line-height: 1.4;
    }
    
    .btn {
      display: block;
      text-decoration: none;
      background: var(--btn);
      color: var(--btnText);
      border-radius: var(--radius);
      padding: 14px 16px;
      margin: 12px 0;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
      min-height: 48px;
      line-height: 1.2;
      transition: opacity 0.2s ease;
    }
    
    .btn:hover {
      opacity: 0.9;
    }
    
    .btn:focus {
      outline: 2px solid var(--fg);
      outline-offset: 2px;
    }
    
    .foot {
      margin-top: 28px;
      opacity: 0.6;
      font-size: 12px;
      text-align: center;
      color: var(--muted);
    }
    
    @media (max-width: 480px) {
      .wrap {
        padding: 16px 12px 48px;
      }
      
      .avatar {
        width: 72px;
        height: 72px;
      }
      
      .name {
        font-size: 20px;
      }
      
      .btn {
        padding: 12px 14px;
        font-size: 15px;
      }
    }
  </style>
</head>
<body data-theme="${esc(theme)}">
  <main class="wrap">
    <section class="center">
      ${avatarUrl ? `<img class="avatar" src="${esc(avatarUrl)}" alt="${displayName}">` : ''}
      <h1 class="name">${displayName}</h1>
      ${bio ? `<p class="bio">${bio}</p>` : ''}
    </section>
    <nav>
      ${safeLinks.map(link => 
        `<a class="btn" href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.title)}</a>`
      ).join('')}
    </nav>
    <footer class="foot">Made with Lynkby</footer>
  </main>
</body>
</html>`;
}

/**
 * Generate robots.txt content
 */
export function renderRobots(): string {
	return `User-agent: *
Allow: /`;
}

/**
 * Generate 404 page
 */
export function render404(username?: string): string {
	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found | Lynkby</title>
  <link rel="icon" href="data:,">
  <style>
    body {
      font: 16px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      text-align: center;
      background: #f8f8f8;
      color: #333;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; margin: 0 0 16px; }
    p { margin: 0; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Page not found</h1>
    <p>This page doesn't exist or has been removed.</p>
  </div>
</body>
</html>`;
}
