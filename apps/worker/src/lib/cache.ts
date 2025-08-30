import type { Context } from 'hono';
import type { Bindings } from '../types';

type CfCacheStorage = CacheStorage & { default: Cache };

function getDefaultCache(): Cache {
  return (caches as unknown as CfCacheStorage).default;
}

export async function cacheHTML(
  c: Context<{ Bindings: Bindings }>,
  key: string,
  ttlSeconds = 300,
  htmlProducer: () => Promise<string>
): Promise<Response> {
  const cache = getDefaultCache();
  const url = new URL(c.req.url);
  url.pathname = `/__cache/${key}`;
  const cacheKey = new Request(url.toString(), { method: 'GET' });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const html = await htmlProducer();
  const res = new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': `public, max-age=${ttlSeconds}, stale-while-revalidate=60`
    }
  });
  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export async function purgeUser(c: Context<{ Bindings: Bindings }>, username: string): Promise<void> {
  const cache = getDefaultCache();
  const url = new URL(c.req.url);
  url.pathname = `/__cache/${username}`;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  // There is no direct delete API; overwrite with short TTL
  await cache.put(cacheKey, new Response('', { headers: { 'cache-control': 'max-age=0' } }));
}
