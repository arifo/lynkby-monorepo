import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  links: { label: string; url: string; order: number }[];
};

export default function DemoPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDemoProfiles() {
      try {
        setLoading(true);

        // Fetch demo profiles from the API
        const base = process.env.NEXT_PUBLIC_APP_API_BASE || 'https://lynkby-api.arifento85.workers.dev';
        const response = await fetch(`${base}/api/public/page?username=testuser`);

        if (response.ok) {
          const data = await response.json();
          if (data?.ok && data?.profile) {
            setProfiles([data.profile]);
          }
        }
      } catch (err) {
        console.error('Error fetching demo profiles:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDemoProfiles();
  }, []);

  return (
    <>
      <Head>
        <title>Demo - Lynkby</title>
        <meta name="description" content="See Lynkby in action with our demo profiles" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://lynkby.com/demo" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <nav className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold text-purple-600">
                Lynkby
              </Link>
              <div className="flex items-center space-x-6">
                <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Features
                </Link>
                <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Pricing
                </Link>
                <Link href="/demo" className="text-purple-600 font-semibold">
                  Demo
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-6 py-20 text-center bg-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              See Lynkby in action
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Experience the speed and beauty of our link-in-bio platform with these demo profiles.
            </p>
          </div>
        </section>

        {/* Demo Profiles */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Loading demo profiles...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {profiles.map((profile) => (
                  <div key={profile.username} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt=""
                          className="w-20 h-20 rounded-full mx-auto mb-4"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <span className="text-2xl text-purple-600">👤</span>
                        </div>
                      )}

                      <h3 className="text-xl font-semibold text-center mb-2">
                        @{profile.username}
                      </h3>

                      {profile.bio && (
                        <p className="text-gray-600 text-center mb-6">
                          {profile.bio}
                        </p>
                      )}

                      <div className="space-y-3">
                        {profile.links.map((link, index) => (
                          <a
                            key={index}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full px-4 py-3 text-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 text-center">
                      <Link
                        href={`/u/${profile.username}`}
                        className="text-purple-600 hover:text-purple-700 font-semibold"
                      >
                        View Full Profile →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profiles.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No demo profiles available</p>
                <p className="text-sm text-gray-500">
                  Try visiting <code className="bg-gray-100 px-2 py-1 rounded">/u/testuser</code> to see a sample profile
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to create your own?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of creators who trust Lynkby for their link-in-bio needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                Get Started Free
              </Link>
              <Link
                href="/features"
                className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
