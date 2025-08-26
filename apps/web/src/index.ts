import { Hono } from "hono";

type Env = { 
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_API_BASE?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Health endpoint
app.get("/_health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// Main route handler for wildcard subdomains
app.get("*", async (c) => {
  const url = new URL(c.req.url);
  const hostname = url.hostname;
  const path = url.pathname;
  
  // Extract username from subdomain (e.g., "bobo.lynkby.com" -> "bobo")
  const subdomain = hostname.split('.')[0];
  
  // Skip if it's a reserved subdomain
  const reserved = ['www', 'app', 'api', 'marketing', 'web', 'dev', 'staging'];
  if (reserved.includes(subdomain)) {
    return c.json({ error: "Reserved subdomain" }, 400);
  }
  
  // Handle different paths
  if (path === "/") {
    // Main profile page
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>@${subdomain} — Lynkby</title>
          <meta name="description" content="Profile page for @${subdomain} on Lynkby">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f8fafc; 
              min-height: 100vh;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              padding: 40px; 
              border-radius: 16px; 
              box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
              text-align: center;
            }
            .profile-header { 
              margin-bottom: 30px; 
            }
            .username { 
              font-size: 2.5rem; 
              font-weight: 800; 
              color: #1e293b; 
              margin-bottom: 10px; 
            }
            .subtitle { 
              color: #64748b; 
              font-size: 1.1rem; 
              margin-bottom: 30px; 
            }
            .loading { 
              color: #64748b; 
              font-style: italic; 
            }
            .error { 
              color: #dc2626; 
              background: #fef2f2; 
              padding: 20px; 
              border-radius: 8px; 
              border: 1px solid #fecaca; 
            }
            .links { 
              display: grid; 
              gap: 15px; 
              margin: 30px 0; 
            }
            .link { 
              background: #2563eb; 
              color: white; 
              padding: 16px 24px; 
              border-radius: 12px; 
              text-decoration: none; 
              font-weight: 600; 
              transition: all 0.2s ease; 
            }
            .link:hover { 
              transform: translateY(-2px); 
              box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); 
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e2e8f0; 
              color: #64748b; 
              font-size: 0.9rem; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="profile-header">
              <div class="username">@${subdomain}</div>
              <div class="subtitle">Lynkby Profile</div>
            </div>
            
            <div id="profile-content">
              <div class="loading">Loading profile...</div>
            </div>
            
            <div class="footer">
              <p>Powered by <a href="https://lynkby.com" style="color: #2563eb;">Lynkby</a></p>
              <p>Environment: ${c.env?.NODE_ENV || 'development'}</p>
            </div>
          </div>
          
          <script>
            // Fetch profile data from API
            async function loadProfile() {
              try {
                const apiBase = '${c.env?.NEXT_PUBLIC_APP_API_BASE || 'https://api.lynkby.com'}';
                const response = await fetch(\`\${apiBase}/api/public/page?username=${subdomain}\`);
                
                if (!response.ok) {
                  throw new Error('Profile not found');
                }
                
                const data = await response.json();
                
                if (data.ok && data.profile) {
                  displayProfile(data.profile);
                } else {
                  throw new Error(data.error || 'Failed to load profile');
                }
              } catch (error) {
                displayError(error.message);
              }
            }
            
            function displayProfile(profile) {
              const content = document.getElementById('profile-content');
              content.innerHTML = \`
                \${profile.bio ? \`<p style="color: #64748b; margin-bottom: 30px;">\${profile.bio}</p>\` : ''}
                <div class="links">
                  \${profile.links.map(link => \`
                    <a href="\${link.url}" target="_blank" rel="noopener noreferrer" class="link">
                      \${link.label}
                    </a>
                  \`).join('')}
                </div>
              \`;
            }
            
            function displayError(message) {
              const content = document.getElementById('profile-content');
              content.innerHTML = \`
                <div class="error">
                  <strong>Error:</strong> \${message}
                </div>
              \`;
            }
            
            // Load profile when page loads
            loadProfile();
          </script>
        </body>
      </html>
    `);
  }
  
  // API routes - delegate to the main API worker
  if (path.startsWith("/api/")) {
    const apiBase = c.env?.NEXT_PUBLIC_APP_API_BASE || "https://api.lynkby.com";
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
