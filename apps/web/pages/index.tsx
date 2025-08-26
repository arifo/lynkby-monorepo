import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Lynkby — TikTok‑native link‑in‑bio</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Ultra‑fast landing pages that auto‑sync your TikToks. Lowest‑fee tip jar. Simple analytics.
      </p>
      <ul>
        <li><Link href="/u/testuser">Preview a demo page → /u/testuser</Link></li>
      </ul>
      <hr style={{ margin: "24px 0" }} />
      <p>App will live at <code>app.lynkby.com</code>. Public pages at <code>user.lynkby.com</code>.</p>
    </main>
  );
}
