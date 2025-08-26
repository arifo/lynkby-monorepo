import { Hono } from "hono";

type Env = { 
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_API_BASE?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Health endpoint
app.get("/_health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// Main marketing routes
app.get("/", async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Lynkby - Ultra-fast landing pages that auto-sync your TikToks</title>
        <meta name="description" content="Create lightning-fast landing pages that automatically sync with your TikTok content. Boost your online presence with Lynkby.">
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
          }
          .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            text-align: center;
          }
          h1 { 
            font-size: 3.5rem; 
            margin-bottom: 20px; 
            font-weight: 800;
            background: linear-gradient(45deg, #fff, #f0f0f0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .subtitle { 
            font-size: 1.5rem; 
            margin-bottom: 40px; 
            opacity: 0.9;
            font-weight: 300;
          }
          .cta-button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 16px 32px; 
            border-radius: 50px; 
            text-decoration: none; 
            font-weight: 600; 
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
          }
          .cta-button:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
          }
          .features { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 30px; 
            margin: 60px 0; 
          }
          .feature { 
            background: rgba(255, 255, 255, 0.1); 
            padding: 30px; 
            border-radius: 20px; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .feature h3 { 
            margin-bottom: 15px; 
            color: #fbbf24;
          }
          .demo-link { 
            margin-top: 40px; 
          }
          .demo-link a { 
            color: #fbbf24; 
            text-decoration: none; 
            font-weight: 500;
          }
          .demo-link a:hover { 
            text-decoration: underline; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Lynkby</h1>
          <p class="subtitle">Ultra-fast landing pages that auto-sync your TikToks</p>
          
          <a href="https://app.lynkby.com" class="cta-button">Get Started</a>
          
          <div class="features">
            <div class="feature">
              <h3>⚡ Lightning Fast</h3>
              <p>Built on Cloudflare's edge network for instant loading worldwide</p>
            </div>
            <div class="feature">
              <h3>🔄 Auto-Sync</h3>
              <p>Your landing page automatically updates with your latest TikTok content</p>
            </div>
            <div class="feature">
              <h3>🎨 Beautiful Design</h3>
              <p>Professional templates that look great on all devices</p>
            </div>
          </div>
          
          <div class="demo-link">
            <p>See it in action: <a href="/demo">View Demo</a></p>
          </div>
          
          <p style="margin-top: 60px; opacity: 0.7; font-size: 0.9rem;">
            Environment: ${c.env?.NODE_ENV || 'development'} | 
            API: ${c.env?.NEXT_PUBLIC_APP_API_BASE || 'https://api.lynkby.com'}
          </p>
        </div>
      </body>
    </html>
  `);
});

app.get("/demo", async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Lynkby Demo - Profile Preview</title>
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
          }
          .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          }
          h1 { color: #2563eb; margin-bottom: 20px; }
          .demo-info { 
            background: #f0f9ff; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #2563eb; 
            margin: 20px 0; 
          }
          .api-status { 
            background: #f8fafc; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 10px 0; 
            font-family: monospace; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎯 Lynkby Demo</h1>
          <p>This is a demo of the Lynkby profile system.</p>
          
          <div class="demo-info">
            <h3>📡 API Integration</h3>
            <p>This demo connects to the Lynkby API to show real profile data:</p>
            <div class="api-status">API Base: ${c.env?.NEXT_PUBLIC_APP_API_BASE || 'https://api.lynkby.com'}</div>
          </div>
          
          <h3>🔗 Quick Links</h3>
          <ul>
            <li><a href="https://app.lynkby.com">Dashboard</a></li>
            <li><a href="https://web.lynkby.com">Web App</a></li>
            <li><a href="/">Back to Home</a></li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Catch-all route for other marketing pages
app.get("*", async (c) => {
  const path = c.req.path;
  
  if (path === "/404") {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Page Not Found - Lynkby</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 40px; text-align: center; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc2626; margin-bottom: 20px; }
            .back-link { margin-top: 30px; }
            .back-link a { color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <div class="back-link">
              <a href="/">← Back to Home</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }
  
  // Default 404
  return c.json({ error: "Not found" }, 404);
});

export default app;
