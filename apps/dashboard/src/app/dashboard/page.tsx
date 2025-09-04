"use client";


import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, BarChart3, Link, Settings, LogOut, User, Plus } from "lucide-react";
import { userAPI } from "@/lib/api";
import { User as AuthUser } from "@/lib/auth";

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<null | AuthUser>(null);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.username) return;
      // setLoadingProfile(true);
      // setProfileError(null);
      try {
        const res = await userAPI.getProfile();
        if (res.ok && res.user) {
          setProfile(res.user);
        } else {
          setProfile(null);
        }
      } catch {
        console.error("Failed to load profile");
      }
    };
    load();
  }, [user?.username]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Lynkby</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {/* {profile?.page?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.page.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )} */}
              <span>@{user?.username || "username"}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {profile?.username || (user?.username ? `@${user.username}` : user?.email)}!
          </h1>
          {/* {profile?.page?.bio ? (
            <p className="text-gray-600">{profile.page.bio}</p>
          ) : (
            <p className="text-gray-600">Manage your links, track analytics, and grow your audience.</p>
          )} */}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Links</p>
                {/* <p className="text-2xl font-bold text-gray-900">{profile?.page?.links?.length ?? 0}</p> */}
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Link className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold text-gray-900">0%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Link */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Create Link</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Create a new short link or add a link to your bio page.
            </p>
            <Button className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create New Link
            </Button>
          </div>

          {/* Manage Bio Page */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Bio Page</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Customize your link-in-bio page with themes and layouts.
            </p>
            <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/editor')}>
              <LinkIcon className="w-4 h-4 mr-2" />
              Customize Page
            </Button>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            </div>
            <p className="text-gray-600 mb-4">
              View detailed analytics and insights for your links.
            </p>
            <Button className="w-full" variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Manage your account settings and preferences.
            </p>
            <Button className="w-full" variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Manage Settings
            </Button>
          </div>

          {/* Profile */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Update your profile information and avatar.
            </p>
            <Button className="w-full" variant="outline">
              <User className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Access frequently used features and shortcuts.
            </p>
            <Button className="w-full" variant="outline">
              <LinkIcon className="w-4 h-4 mr-2" />
              View Actions
            </Button>
          </div>
        </div>

        {/* Getting Started */}
        {user?.isNewUser && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
            <p className="text-blue-700 mb-4">
              Welcome to Lynkby! Here are some things you can do to get started:
            </p>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• Create your first link</p>
              <p>• Customize your bio page</p>
              <p>• Connect your social media accounts</p>
              <p>• Set up analytics tracking</p>
            </div>
          </div>
        )}

        {/* Public URLs */}
        {user?.username && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Public URLs</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                Subdomain: <a className="text-blue-600 hover:underline" href={`https://${user.username}.lynkby.com`} target="_blank" rel="noreferrer">https://{user.username}.lynkby.com</a>
              </p>
              <p>
                Path: <a className="text-blue-600 hover:underline" href={`https://lynkby.com/u/${user.username}`} target="_blank" rel="noreferrer">https://lynkby.com/u/{user.username}</a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireUsername={true}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
