type AssetFetcher = { fetch: (request: Request) => Promise<Response> };

export default {
  async fetch(request: Request, env: { ASSETS: AssetFetcher }, ctx: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/_health') {
      return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }
    // Serve static assets exported by Next (./out)
    return env.ASSETS.fetch(request);
  }
};
