import Head from "next/head";

export default function AppHome() {
  return (
    <div style={{ padding: 20 }}>
      <Head>
        <title>Lynkby App</title>
        <meta name="description" content="Manage your Lynkby profile" />
      </Head>

      <main>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, marginBottom: 12 }}>Lynkby — App</h1>
            <p style={{ fontSize: 16, color: "#666", marginBottom: 20 }}>
              Manage your public profile and links
            </p>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ padding: 20, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>Profile Management</h2>
              <p style={{ color: "#666", marginBottom: 16 }}>
                Create and edit your public profile that will be displayed at your custom subdomain.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <a
                  href="/api/page/get?username=testuser"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  View API
                </a>
                <a
                  href="/api/username/check?username=testuser"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#10b981",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  Check Username
                </a>
              </div>
            </div>

            <div style={{ padding: 20, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>Quick Links</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  href="https://app.lynkby.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  Production App
                </a>
                <a
                  href="https://lynkby.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  Marketing Site
                </a>
                <a
                  href="https://testuser.lynkby.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  Sample Profile
                </a>
              </div>
            </div>

            <div style={{ padding: 20, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>Development</h2>
              <p style={{ color: "#666", marginBottom: 16 }}>
                This app is running in development mode. Use the links above to test functionality.
              </p>
              <div style={{ fontSize: 14, color: "#666" }}>
                <p><strong>Port:</strong> 3001</p>
                <p><strong>Environment:</strong> Development</p>
                <p><strong>Database:</strong> Local PostgreSQL</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
