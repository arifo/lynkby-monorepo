import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import worker from '../src/index';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock caches
const mockCache = {
	match: vi.fn(),
	put: vi.fn()
};

// Mock caches.default
Object.defineProperty(global, 'caches', {
	value: {
		default: mockCache
	},
	writable: true
});

describe('Edge Public Worker', () => {
	const mockEnv: Env = {
		API_BASE: 'https://api.lynkby.com',
		RESERVED: 'www,app,api,admin,support,blog,cdn,static,docs,pricing,status,dashboard,help,mail,dev,stage'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockCache.match.mockResolvedValue(null);
		mockCache.put.mockResolvedValue(undefined);
	});

	describe('Username extraction and validation', () => {
		it('should accept valid usernames', async () => {
			mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
				username: 'testuser',
				displayName: 'Test User',
				bio: 'Test bio',
				page: {
					layout: 'LINKS_LIST',
					theme: 'classic',
					published: true,
					updatedAt: '2025-01-01T00:00:00Z'
				},
				links: []
			}), { status: 200 }));

			const request = new Request('https://testuser.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('x-lynkby-username')).toBe('testuser');
		});

		it('should reject invalid hostnames', async () => {
			const request = new Request('https://example.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});

		it('should reject reserved subdomains', async () => {
			const request = new Request('https://www.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});

		it('should reject invalid username formats', async () => {
			const request = new Request('https://test-user.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});
	});

	describe('Path handling', () => {
		it('should handle root path', async () => {
			mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
				username: 'testuser',
				displayName: 'Test User',
				page: {
					layout: 'LINKS_LIST',
					theme: 'classic',
					published: true,
					updatedAt: '2025-01-01T00:00:00Z'
				},
				links: []
			}), { status: 200 }));

			const request = new Request('https://testuser.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
		});

		it('should handle robots.txt', async () => {
			const request = new Request('https://testuser.lynkby.com/robots.txt');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
			const text = await response.text();
			expect(text).toContain('User-agent: *');
		});

		it('should handle favicon.ico', async () => {
			const request = new Request('https://testuser.lynkby.com/favicon.ico');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(204);
		});

		it('should reject other paths', async () => {
			const request = new Request('https://testuser.lynkby.com/some/path');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});
	});

	describe('API integration', () => {
		it('should fetch and render page data successfully', async () => {
			const mockData = {
				username: 'testuser',
				displayName: 'Test User',
				bio: 'Test bio',
				avatarUrl: 'https://example.com/avatar.jpg',
				page: {
					layout: 'LINKS_LIST',
					theme: 'classic',
					published: true,
					updatedAt: '2025-01-01T00:00:00Z'
				},
				links: [
					{
						title: 'Twitter',
						url: 'https://twitter.com/test',
						active: true,
						position: 0
					},
					{
						title: 'GitHub',
						url: 'https://github.com/test',
						active: true,
						position: 1
					}
				]
			};

			mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));

			const request = new Request('https://testuser.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
			expect(response.headers.get('x-lynkby-cache')).toBe('MISS');
			expect(response.headers.get('x-api-status')).toBe('200');
			expect(response.headers.get('x-page-ver')).toBe('2025-01-01T00:00:00Z');

			const html = await response.text();
			expect(html).toContain('Test User');
			expect(html).toContain('Test bio');
			expect(html).toContain('Twitter');
			expect(html).toContain('GitHub');
			expect(html).toContain('data-theme="classic"');
		});

		it('should handle API 404 responses', async () => {
			mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }));

			const request = new Request('https://nonexistent.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
			expect(response.headers.get('x-api-status')).toBe('404');
		});

		it('should handle API errors', async () => {
			mockFetch.mockRejectedValueOnce(new Error('API error'));

			const request = new Request('https://testuser.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(502);
		});
	});

	describe('Caching', () => {
		it('should return cached response when available', async () => {
			const cachedResponse = new Response('cached html', {
				headers: {
					'content-type': 'text/html; charset=utf-8',
					'x-page-ver': '2025-01-01T00:00:00Z'
				}
			});

			mockCache.match.mockResolvedValueOnce(cachedResponse);

			const request = new Request('https://testuser.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('x-lynkby-cache')).toBe('HIT');
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('Security headers', () => {
		it('should include proper security headers', async () => {
			mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
				username: 'testuser',
				displayName: 'Test User',
				page: {
					layout: 'LINKS_LIST',
					theme: 'classic',
					published: true,
					updatedAt: '2025-01-01T00:00:00Z'
				},
				links: []
			}), { status: 200 }));

			const request = new Request('https://testuser.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.headers.get('x-content-type-options')).toBe('nosniff');
			expect(response.headers.get('referrer-policy')).toBe('no-referrer');
			expect(response.headers.get('strict-transport-security')).toContain('max-age=31536000');
			expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
		});
	});

	describe('HTML escaping', () => {
		it('should escape HTML in user content', async () => {
			const mockData = {
				username: 'testuser',
				displayName: '<script>alert("xss")</script>',
				bio: 'Bio with <img src=x onerror=alert(1)>',
				page: {
					layout: 'LINKS_LIST',
					theme: 'classic',
					published: true,
					updatedAt: '2025-01-01T00:00:00Z'
				},
				links: [
					{
						title: 'Link with <script>',
						url: 'https://example.com',
						active: true,
						position: 0
					}
				]
			};

			mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));

			const request = new Request('https://testuser.lynkby.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			const html = await response.text();
			expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
			expect(html).toContain('Bio with &lt;img src=x onerror=alert(1)&gt;');
			expect(html).toContain('Link with &lt;script&gt;');
			expect(html).not.toContain('<script>');
		});
	});
});