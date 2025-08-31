"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Link as LinkIcon,
  BarChart3,
  Plus,
  Settings,
  LogOut,
  User,
  ExternalLink,
  Calendar,
  TrendingUp,
  Users
} from "lucide-react";

interface LinkStats {
  totalClicks: number;
  totalLinks: number;
  thisMonth: number;
  lastMonth: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [stats, setStats] = useState<LinkStats>({
    totalClicks: 0,
    totalLinks: 0,
    thisMonth: 0,
    lastMonth: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Mock data - replace with actual API calls
    setStats({
      totalClicks: 1247,
      totalLinks: 23,
      thisMonth: 89,
      lastMonth: 156,
    });
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Lynkby Dashboard</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user.email}</span>
              </div>

              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name || user.email.split('@')[0]}!
          </h1>
          <p className="text-gray-600">Your links, pages, and campaigns at a glance.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Links</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLinks}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lastMonth}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Create New Link */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>

            <div className="space-y-4">
              <Button className="w-full justify-start" size="lg">
                <Plus className="w-5 h-5 mr-3" />
                Create New Link
              </Button>

              <Button variant="outline" className="w-full justify-start" size="lg">
                <BarChart3 className="w-5 h-5 mr-3" />
                View Analytics
              </Button>

              <Button variant="outline" className="w-full justify-start" size="lg">
                <Users className="w-5 h-5 mr-3" />
                Manage Team
              </Button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">New link created</p>
                  <p className="text-xs text-gray-500">lynkby.com/social</p>
                </div>
                <span className="text-xs text-gray-400">2h ago</span>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Link clicked</p>
                  <p className="text-xs text-gray-500">lynkby.com/blog</p>
                </div>
                <span className="text-xs text-gray-400">4h ago</span>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Analytics updated</p>
                  <p className="text-xs text-gray-500">Daily report generated</p>
                </div>
                <span className="text-xs text-gray-400">1d ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Links */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Links</h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Link</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Clicks</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">lynkby.com/social</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900">247</td>
                  <td className="py-3 px-4 text-gray-500">2 days ago</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">lynkby.com/blog</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900">156</td>
                  <td className="py-3 px-4 text-gray-500">1 week ago</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-4 h-4 text-green-600" />
                      <span className="font-medium">lynkby.com/contact</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-900">89</td>
                  <td className="py-3 px-4 text-gray-500">2 weeks ago</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Paused
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
