import Head from "next/head";
import { useEffect, useState } from "react";
import { type Profile } from "@lynkby/shared";

type Props = { username: string };

export default function UserPreview({ username }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);

        // Fetch from API's public read-only API endpoint
        let apiUrl: string;
        if (typeof window !== 'undefined') {
          // Client-side: use current hostname to determine API URL
          const hostname = window.location.hostname;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Local development: fetch from local API
            const base = process.env.NEXT_PUBLIC_APP_API_BASE || 'http://localhost:8787';
            apiUrl = `${base}/api/public/page?username=${username}`;
          } else if (hostname.includes('lynkby.com')) {
            // Production: fetch from API via subdomain
            apiUrl = `https://${username}.lynkby.com/api/public/page?username=${username}`;
          } else {
            // Fallback: use production API
            apiUrl = `https://${username}.lynkby.com/api/public/page?username=${username}`;
          }
        } else {
          // Server-side: use production API
          apiUrl = `https://${username}.lynkby.com/api/public/page?username=${username}`;
        }

        console.log('Fetching profile from API:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Response data:', data);
          if (data?.ok && data?.profile) {
            setProfile(data.profile);
          } else {
            console.error('Invalid response format:', data);
            setError(true);
          }
        } else {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching profile from API:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  const canonical = `https://${username}.lynkby.com`;

  // Loading state
  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui", textAlign: "center" }}>
        <div style={{
          width: "96px",
          height: "96px",
          borderRadius: "9999px",
          backgroundColor: "#f3f4f6",
          margin: "0 auto 12px"
        }} />
        <div style={{
          width: "120px",
          height: "24px",
          backgroundColor: "#f3f4f6",
          borderRadius: "4px",
          margin: "0 auto 8px"
        }} />
        <div style={{
          width: "200px",
          height: "16px",
          backgroundColor: "#f3f4f6",
          borderRadius: "4px",
          margin: "0 auto 16px"
        }} />
        <div style={{ display: "grid", gap: "10px", maxWidth: "300px", margin: "0 auto" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: "44px",
              backgroundColor: "#f3f4f6",
              borderRadius: "12px"
            }} />
          ))}
        </div>
      </main>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui", textAlign: "center" }}>
        <h1 style={{ marginBottom: 16 }}>Profile Not Found</h1>
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          No profile found for <b>@{username}</b>
        </p>
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          This profile may not exist or may have been removed.
        </p>
      </main>
    );
  }

  // Profile display
  return (
    <>
      <Head>
        <title>{profile.displayName} — Lynkby</title>
        <link rel="canonical" href={canonical} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </Head>
      <main
        style={{
          fontFamily: "ui-sans-serif, system-ui",
          padding: 16,
          maxWidth: 460,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            width={96}
            height={96}
            style={{ borderRadius: "9999px" }}
          />
        ) : null}
        <h1 style={{ marginTop: 12, marginBottom: 8 }}>@{profile.username}</h1>
        {profile.bio && (
          <p style={{ opacity: 0.8, marginBottom: 16 }}>{profile.bio}</p>
        )}
        <div style={{ display: "grid", gap: 10 }}>
          {(profile.links || []).map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                textDecoration: "none",
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
          Powered by Lynkby • canonical: <a href={canonical}>{canonical}</a>
        </p>
      </main>
    </>
  );
}
