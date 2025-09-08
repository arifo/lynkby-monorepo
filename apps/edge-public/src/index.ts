import { 
	renderHtml, 
	renderRobots, 
	render404, 
	getSecurityHeaders, 
	getCacheHeaders,
	type PublicPageData 
} from '@lynkby/public-renderer';

// Environment interface
interface Env {
	API_BASE: string;
	RESERVED: string;
	API_SERVICE?: Fetcher; // Cloudflare Service Binding to the API worker
}

// Constants
const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;
const RESERVED_SUBDOMAINS = new Set([
	'www', 'app', 'api', 'admin', 'support', 'blog', 'cdn', 'static', 
	'docs', 'pricing', 'status', 'dashboard', 'help', 'mail', 'dev', 'stage'
]);

/**
 * Extract username from hostname
 */
function extractUsername(host: string): string | null {
	const hostname = host.toLowerCase();
	
	// Must end with .lynkby.com
	if (!hostname.endsWith('.lynkby.com')) {
		return null;
	}
	
	// Extract subdomain
	const subdomain = hostname.replace('.lynkby.com', '');
	
	// Check if it's a valid username format
	if (!USERNAME_REGEX.test(subdomain)) {
		return null;
	}
	
	// Check if it's reserved
	if (RESERVED_SUBDOMAINS.has(subdomain)) {
		return null;
	}
	
	return subdomain;
}

/**
 * Check if username is reserved
 */
function isReserved(username: string, env: Env): boolean {
	const reservedList = env.RESERVED.split(',').map(s => s.trim().toLowerCase());
	return reservedList.includes(username.toLowerCase());
}

/**
 * Add standard headers to response
 */
function withStdHeaders(
	response: Response, 
	meta: { 
		cache: string; 
		username: string; 
		apiStatus?: number;
		updatedAt?: string;
	}
): Response {
	const headers = new Headers(response.headers);
	
	headers.set('x-lynkby-username', meta.username);
	headers.set('x-lynkby-cache', meta.cache);
	
	if (meta.apiStatus) {
		headers.set('x-api-status', meta.apiStatus.toString());
	}
	
	if (meta.updatedAt) {
		headers.set('x-page-ver', meta.updatedAt);
	}
	
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

/**
 * Generate robots.txt response
 */
function robots(): Response {
	return new Response(renderRobots(), {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'max-age=86400'
		}
	});
}

/**
 * Generate favicon response
 */
function tinyFavicon(): Response {
	// Return 204 No Content for favicon
	return new Response(null, { status: 204 });
}

/**
 * Generate 404 response
 */
function notFound(username?: string, apiStatus?: number): Response {
	const html = render404(username);
	const response = new Response(html, {
		status: 404,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-cache'
		}
	});
	
	return withStdHeaders(response, { 
		cache: 'MISS', 
		username: username || 'unknown',
		apiStatus
	});
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
	url: string, 
	options: RequestInit, 
	maxRetries: number = 3
): Promise<Response> {
	let lastError: Error | null = null;
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, {
				...options,
				signal: AbortSignal.timeout(10000) // 10 second timeout per attempt
			});
			
			// If we get a response (even error status), return it
			return response;
		} catch (error) {
			lastError = error as Error;
			
			// Don't retry on the last attempt
			if (attempt === maxRetries) {
				break;
			}
			
			// Exponential backoff: wait 1s, 2s, 4s
			const delay = Math.pow(2, attempt) * 1000;
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	throw lastError || new Error('All fetch attempts failed');
}

/**
 * Log request for observability (10% sampling)
 */
function logRequest(
	host: string, 
	username: string, 
	cache: string, 
	apiStatus: number, 
	durFetchMs: number, 
	durRenderMs: number
): void {
	// 10% sampling
	if (Math.random() < 0.1) {
		console.log(JSON.stringify({
			ts: new Date().toISOString(),
			host,
			username,
			cache,
			apiStatus,
			durFetchMs,
			durRenderMs
		}));
	}
}

/**
 * Main worker handler
 */
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const host = url.hostname.toLowerCase();
		const startTime = Date.now();
		
		// Only support GET requests
		if (request.method !== 'GET') {
			return notFound();
		}
		
		// Extract username from hostname
		const username = extractUsername(host);
		if (!username || isReserved(username, env)) {
			return notFound();
		}
		
		// Handle special paths
		if (url.pathname === '/robots.txt') {
			return robots();
		}
		
		if (url.pathname === '/favicon.ico') {
			return tinyFavicon();
		}
		
		// Only root path is supported for subdomains
		if (url.pathname !== '/') {
			return notFound(username);
		}
		
		// Check cache first
		const cache = caches.default;
		const cacheKey = new Request(`https://${host}/`, { method: 'GET' });
		
		const cached = await cache.match(cacheKey);
		if (cached) {
			const fetchTime = Date.now() - startTime;
			logRequest(host, username, 'HIT', 200, 0, fetchTime);
			return withStdHeaders(cached, { 
				cache: 'HIT', 
				username,
				updatedAt: cached.headers.get('x-page-ver') || undefined
			});
		}
		
		// Cache miss - fetch from API
		const apiPath = `/v1/public/page/by-username/${encodeURIComponent(username)}`;
		const apiUrl = `${env.API_BASE}${apiPath}`;
		const fetchStart = Date.now();
		try {
			let apiResponse: Response | null = null;

			// Prefer in-edge call via Service Binding to avoid CF 522s
			if (env.API_SERVICE && typeof env.API_SERVICE.fetch === 'function') {
					try {
						const boundReq = new Request(`https://api.internal${apiPath}`, {
							headers: {
								'User-Agent': 'Lynkby-Edge-Worker/1.0',
								'Accept': 'application/json'
							}
						});
						apiResponse = await env.API_SERVICE.fetch(boundReq, { signal: AbortSignal.timeout(10000) } as RequestInit);
					} catch (e) {
						// Fallback below
					}
				}
				// Fallback to external HTTPS fetch (may traverse CF to origin)
				if (!apiResponse) {
					apiResponse = await fetchWithRetry(apiUrl, {
					cf: { 
						cacheTtl: 0, 
						cacheEverything: false 
					},
					headers: {
						'User-Agent': 'Lynkby-Edge-Worker/1.0',
						'Accept': 'application/json'
					}
				});
			}
			const fetchTime = Date.now() - fetchStart;
				const apiStatus = apiResponse.status;
				if (apiStatus !== 200) {
					const totalTime = Date.now() - startTime;
					logRequest(host, username, 'MISS', apiStatus, fetchTime, totalTime - fetchTime);
					return notFound(username, apiStatus);
				}
			
			// Parse API response
				const apiData = await apiResponse.json() as PublicPageData;
				if (!apiData) {
					const totalTime = Date.now() - startTime;
					logRequest(host, username, 'MISS', 404, fetchTime, totalTime - fetchTime);
					return notFound(username, 404);
				}
			
			// Render HTML
			const renderStart = Date.now();
			const html = renderHtml(apiData, { 
				mode: 'public', 
				requestHost: host 
			});
				const renderTime = Date.now() - renderStart;
				// Create response with security and cache headers
				const securityHeaders = getSecurityHeaders('public', apiData.page?.updatedAt);
				const cacheHeaders = getCacheHeaders('public');
				const response = new Response(html, {
					headers: {
						...securityHeaders,
						...cacheHeaders
					}
				});
			// Cache the response
			ctx.waitUntil(cache.put(cacheKey, response.clone()));
			
			// Log and return
			const totalTime = Date.now() - startTime;
				logRequest(host, username, 'MISS', apiStatus, fetchTime, renderTime);
				return withStdHeaders(response, { 
					cache: 'MISS', 
					username, 
					apiStatus,
					updatedAt: apiData.page?.updatedAt
				});
			
		} catch (error) {
			// Handle API errors
			const fetchTime = Date.now() - fetchStart;
			const totalTime = Date.now() - startTime;
			logRequest(host, username, 'MISS', 500, fetchTime, totalTime - fetchTime);
						
			// Try to return cached version if available
			const cached = await cache.match(cacheKey);
			if (cached) {
				return withStdHeaders(cached, { 
					cache: 'HIT', 
					username,
					updatedAt: cached.headers.get('x-page-ver') || undefined
				});
			}
			
			// Return 502 error page
			const errorHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Service temporarily unavailable | Lynkby</title>
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
    <h1>Service temporarily unavailable</h1>
    <p>Please try again in a few moments.</p>
  </div>
</body>
</html>`;
			
			return new Response(errorHtml, {
				status: 502,
				headers: {
					'content-type': 'text/html; charset=utf-8',
					'cache-control': 'no-cache'
				}
			});
		}
	}
} satisfies ExportedHandler<Env>;
