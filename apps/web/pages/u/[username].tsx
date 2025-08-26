import Head from "next/head";
import type { GetServerSideProps } from "next";
import { getProfile, type Profile } from "@lynkby/shared";

type Props = { profile: Profile | null; username: string };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const username = String(ctx.params?.username || "").toLowerCase();
  const profile = getProfile(username);
  return { props: { profile, username } };
};

export default function UserPreview({ profile, username }: Props) {
  const canonical = `https://${username}.lynkby.com`;
  if (!profile) {
    return <main style={{padding: 24}}>No profile found for <b>{username}</b>.</main>;
  }
  return (
    <>
      <Head>
        <title>{profile.displayName} — Lynkby</title>
        <link rel="canonical" href={canonical} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </Head>
      <main style={{
        fontFamily: "ui-sans-serif, system-ui",
        padding: 16,
        maxWidth: 460,
        margin: "0 auto",
        textAlign: "center"
      }}>
        <img src={profile.avatarUrl ?? ""} alt="" width={96} height={96} style={{borderRadius: "9999px"}} />
        <h1 style={{marginTop: 12, marginBottom: 8}}>@{profile.username}</h1>
        {profile.bio && <p style={{opacity: 0.8, marginBottom: 16}}>{profile.bio}</p>}
        <div style={{display: "grid", gap: 10}}>
          {profile.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                textDecoration: "none"
              }}>
              {l.label}
            </a>
          ))}
        </div>
        <p style={{marginTop: 24, fontSize: 12, opacity: 0.6}}>
          Preview mode • canonical: <a href={canonical}>{canonical}</a>
        </p>
      </main>
    </>
  );
}
