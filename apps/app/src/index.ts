import { Hono } from "hono";

type Env = { 
  NODE_ENV?: string;
  APP_API_BASE?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Health endpoint
app.get("/_health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// Main dashboard route - serve the Next.js app
app.get("*", async (c) => {
  const path = c.req.path;
  
  // For now, serve a simple dashboard interface
  // In production, this would serve the built Next.js app
  if (path === "/") {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lynkby Dashboard</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2563eb; margin-bottom: 20px; }
            .api-info { background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .endpoint { background: #f8fafc; padding: 15px; border-radius: 6px; margin: 10px 0; font-family: monospace; }
            .note { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Lynkby Dashboard</h1>
            <p>Welcome to your Lynkby dashboard! This is where you can manage your profile and links.</p>
            
            <div class="api-info">
              <h3>📡 API Integration</h3>
              <p>This dashboard connects to the Lynkby API for data management:</p>
              <div class="endpoint">Base URL: ${c.env?.APP_API_BASE || 'https://api.lynkby.com'}</div>
            </div>
            
            <div class="note">
              <strong>Note:</strong> This is a basic worker implementation. For full Next.js functionality, 
              consider using Cloudflare Pages or enhancing this worker to serve the complete Next.js build.
            </div>
            
            <h3>🔗 Quick Actions</h3>
            <ul>
              <li><a href="/api/page/get?username=testuser">View Sample Profile</a></li>
              <li><a href="/_health">Health Check</a></li>
            </ul>
            
            <p><strong>Environment:</strong> ${c.env?.NODE_ENV || 'development'}</p>
            <p><strong>Current Path:</strong> ${path}</p>
          </div>
        </body>
      </html>
    `);
  }
  
  // API routes - delegate to the main API worker
  if (path.startsWith("/api/")) {
    const apiBase = c.env?.APP_API_BASE || "https://api.lynkby.com";
    const apiUrl = `${apiBase}${path}`;
    
    try {
      const response = await fetch(apiUrl, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.method !== "GET" ? await c.req.raw.arrayBuffer() : undefined,
      });
      
      const data = await response.arrayBuffer();
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (err) {
      const error = err as Error;
      return c.json({ error: "API proxy error", details: error.message }, 500);
    }
  }
  
  // Default 404
  return c.json({ error: "Not found" }, 404);
});

export default app;
