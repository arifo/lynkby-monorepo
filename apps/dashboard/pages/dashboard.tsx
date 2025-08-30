import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';

interface Profile {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  links: Array<{
    label: string;
    url: string;
    order: number;
  }>;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile();
    }
  }, [isAuthenticated, user]);

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/page/get?username=${user?.username || 'testuser'}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Dashboard - Lynkby</title>
      </Head>

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Lynkby</h1>
              <span className="ml-4 text-sm text-gray-500">Dashboard</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user?.email}</span>
                {user?.username && (
                  <span className="ml-2 text-gray-500">@{user.username}</span>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Section */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Your Profile
                  </h3>

                  {isLoadingProfile ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ) : profile ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Display Name
                        </label>
                        <p className="mt-1 text-sm text-gray-900">{profile.displayName}</p>
                      </div>

                      {profile.bio && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Bio
                          </label>
                          <p className="mt-1 text-sm text-gray-900">{profile.bio}</p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Username
                        </label>
                        <p className="mt-1 text-sm text-gray-900">@{profile.username}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Public URL
                        </label>
                        <a
                          href={`https://${profile.username}.lynkby.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          {profile.username}.lynkby.com
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No profile found</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Quick Actions
                  </h3>

                  <div className="space-y-3">
                    <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Edit Profile
                    </button>

                    <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      Manage Links
                    </button>

                    <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                      View Analytics
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="mt-6 bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Account
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
