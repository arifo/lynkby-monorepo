import { Hono } from "hono";
import { getProfile } from "@lynkby/shared";

const app = new Hono();

app.get("*", (c) => {
  const host = c.req.header("host") || "";
  const username = host.replace(".lynkby.com", "").toLowerCase();

  const reserved = new Set(["", "www", "app", "api", "static", "cdn", "help"]);
  if (reserved.has(username)) return c.text("Reserved host", 404);

  const profile = getProfile(username);
  if (!profile) return c.text("Profile not found", 404);

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"/>
<title>${profile.displayName} — Lynkby</title>
<link rel="canonical" href="https://${username}.lynkby.com" />
<body style="font-family: ui-sans-serif, system-ui; margin:0; padding:16px; display:grid; place-items:center;">
  <main style="width:min(460px,100%); text-align:center;">
    <img src="${profile.avatarUrl ?? ""}" alt="" width="96" height="96" style="border-radius:9999px"/>
    <h1 style="margin:12px 0">@${profile.username}</h1>
    ${profile.bio ? `<p style="opacity:.8;margin-bottom:16px">${profile.bio}</p>` : ""}
    <div style="display:grid;gap:10px">
      ${profile.links.map(l => `
        <a href="${l.url}" target="_blank" rel="noreferrer" style="padding:12px 16px; border:1px solid #e5e7eb; border-radius:12px; text-decoration:none; display:block;">
          ${l.label}
        </a>
      `).join("")}
    </div>
    <p style="margin-top:24px;font-size:12px;opacity:.6">Served from Cloudflare Workers • ${new Date().toISOString()}</p>
  </main>
</body>
</html>`;

  return c.html(html, 200);
});

export default app;
