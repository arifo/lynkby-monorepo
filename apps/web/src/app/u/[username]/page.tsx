import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Profile } from "@lynkby/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

async function fetchProfile(username: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/pages/${encodeURIComponent(username)}`, {
      headers: { "Content-Type": "application/json" },
      // Cache public content briefly; API also controls cache headers
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json() as { ok: boolean; profile: Profile };

    return data?.ok && data?.profile ? (data.profile as Profile) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const usernameLower = username?.toLowerCase();
  const profile = await fetchProfile(usernameLower);
  const titleBase = profile?.displayName || `@${usernameLower}`;
  const description = profile?.bio || `View ${titleBase}'s Lynkby page.`;
  const url = `https://lynkby.com/u/${usernameLower}`;
  return {
    title: `${titleBase} • Lynkby`,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${titleBase} • Lynkby`, description, url },
    twitter: { title: `${titleBase} • Lynkby`, description },
  };
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const usernameLower = username?.toLowerCase();
  if (!usernameLower) notFound();
  const profile = await fetchProfile(usernameLower);
  if (!profile) notFound();

  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={`${profile.displayName} avatar`} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{profile.displayName || `@${profile.username}`}</h1>
            <p className="text-gray-600">@{profile.username}</p>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-gray-700">{profile.bio}</p>}

        {profile.links?.length > 0 && (
          <ul className="mt-6 space-y-3">
            {profile.links.sort((a, b) => (a.order || 0) - (b.order || 0)).map((l, i) => (
              <li key={`${l.label}-${i}`}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center px-4 py-3 rounded-lg border hover:bg-gray-50"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

