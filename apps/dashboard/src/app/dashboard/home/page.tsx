"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, BarChart3, LogOut, Copy, ExternalLink, Check, Eye, Palette, Sparkles } from "lucide-react";
import { pagesAPI } from "@/lib/api";
import type { DashboardSummary } from '@lynkby/shared';

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  done: boolean;
  action?: () => void;
}

const THEME_PRESETS = {
  classic: { name: "Classic", description: "Clean and minimal" },
  contrast: { name: "Contrast", description: "High contrast for accessibility" },
  warm: { name: "Warm", description: "Warm and friendly tones" }
} as const;

function DashboardHomeContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [showTikTokPreview, setShowTikTokPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pagesAPI.getSummary();
      setSummary(data);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Failed to load summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [user?.username]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openLivePage = () => {
    if (summary?.liveUrl) {
      window.open(summary.liveUrl, "_blank");
    }
  };

  const applyTheme = async (theme: string) => {
    try {
      await pagesAPI.updateMyPage({ theme });
      await loadSummary(); // Reload to get updated data
    } catch (err) {
      console.error("Failed to apply theme:", err);
    }
  };

  const toggleChecklistItem = async (key: string) => {
    if (!summary) return;

    const currentState = summary.setup.checklist[key as keyof typeof summary.setup.checklist];
    const newDone = !currentState.done;

    try {
      const result = await pagesAPI.updateChecklistItem(key, newDone);
      if (result.ok && result.checklist) {
        setSummary(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            setup: {
              ...prev.setup,
              checklist: result.checklist
            }
          };
        });
      }
    } catch (err) {
      console.error("Failed to update checklist:", err);
    }
  };

  const getChecklistItems = (): ChecklistItem[] => {
    if (!summary) return [];

    const { setup, profile, links, page } = summary;
    const { checklist } = setup;

    return [
      {
        key: "displayNameAvatar",
        title: "Set Display Name & Avatar",
        description: "Personalize your profile",
        done: checklist.displayNameAvatar.done || !!(profile.displayName || profile.avatarUrl),
        action: () => router.push("/dashboard/editor#profile")
      },
      {
        key: "addLinks3Plus",
        title: "Add 3–5 Links",
        description: "Build your link collection",
        done: checklist.addLinks3Plus.done || links.count >= 3,
        action: () => router.push("/dashboard/editor#links")
      },
      {
        key: "chooseTheme",
        title: "Pick a Theme",
        description: "Choose classic, contrast, or warm",
        done: checklist.chooseTheme.done || page.theme !== "classic",
        action: () => router.push("/dashboard/editor#theme")
      },
      {
        key: "addBio",
        title: "Add a short bio",
        description: "Tell people about yourself (280 chars)",
        done: checklist.addBio.done || !!(profile.bio && profile.bio.length >= 20),
        action: () => router.push("/dashboard/editor#profile")
      },
      {
        key: "copyLinkToTikTok",
        title: "Copy your link to TikTok bio",
        description: "Share your Lynkby page",
        done: checklist.copyLinkToTikTok.done,
        action: () => {
          if (summary?.liveUrl) {
            copyToClipboard(summary.liveUrl);
            toggleChecklistItem("copyLinkToTikTok");
          }
        }
      }
    ];
  };

  const getCompletionPercentage = (): number => {
    const items = getChecklistItems();
    const completed = items.filter(item => item.done).length;
    return Math.round((completed / items.length) * 100);
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadSummary}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const checklistItems = getChecklistItems();
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Lynkby</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live link chip */}
            <button
              onClick={() => copyToClipboard(summary.liveUrl)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
            >
              <span className="text-gray-700">{summary.username}.lynkby.com</span>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>

            {/* Plan badge */}
            <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {summary.plan}
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Strip */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Your page is live</h1>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">{summary.liveUrl}</span>
                  <button
                    onClick={() => copyToClipboard(summary.liveUrl)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
              </div>
              <Button onClick={openLivePage} variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
            </div>
            <Button
              onClick={() => setShowTikTokPreview(true)}
              variant="outline"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              View as TikTok
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Next Steps Checklist */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{completionPercentage}%</span>
              </div>
            </div>

            <div className="space-y-3">
              {checklistItems.map((item) => (
                <div key={item.key} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <button
                    onClick={() => toggleChecklistItem(item.key)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.done
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 hover:border-blue-500'
                      }`}
                  >
                    {item.done && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  {item.action && (
                    <Button
                      onClick={item.action}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Go
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => router.push("/dashboard/editor")}
                className="h-12 flex flex-col items-center justify-center space-y-1"
                variant="outline"
              >
                <LinkIcon className="w-5 h-5" />
                <span className="text-sm">Edit Page</span>
              </Button>
              <Button
                onClick={openLivePage}
                className="h-12 flex flex-col items-center justify-center space-y-1"
                variant="outline"
              >
                <ExternalLink className="w-5 h-5" />
                <span className="text-sm">View Live</span>
              </Button>
              <Button
                onClick={() => copyToClipboard(summary.liveUrl)}
                className="h-12 flex flex-col items-center justify-center space-y-1"
                variant="outline"
              >
                <Copy className="w-5 h-5" />
                <span className="text-sm">Copy Link</span>
              </Button>
              <Button
                onClick={() => setShowTikTokPreview(true)}
                className="h-12 flex flex-col items-center justify-center space-y-1"
                variant="outline"
              >
                <Eye className="w-5 h-5" />
                <span className="text-sm">TikTok Preview</span>
              </Button>
            </div>
          </div>

          {/* At-a-Glance */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">At-a-Glance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">All-time views</span>
                <span className="text-2xl font-bold text-gray-900">{summary.page.viewsAllTime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Links on your page</span>
                <span className="text-2xl font-bold text-gray-900">{summary.links.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last updated</span>
                <span className="text-sm text-gray-900">{formatRelativeTime(summary.page.updatedAt)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Detailed analytics coming soon
              </div>
            </div>
          </div>

          {/* Theme & Branding */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Theme & Branding</h2>
            <div className="space-y-3">
              {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                <label
                  key={key}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${summary.page.theme === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={key}
                    checked={summary.page.theme === key}
                    onChange={() => applyTheme(key)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{preset.name}</div>
                    <div className="text-sm text-gray-600">{preset.description}</div>
                  </div>
                  {summary.page.theme === key && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </label>
              ))}
              <div className="text-xs text-gray-500 mt-2">
                Full customization in Pro (Week 6)
              </div>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg opacity-60">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium text-gray-700">TikTok Auto-Sync</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">Connect TikTok → auto import last posts</p>
                <div className="text-xs text-gray-500">Coming soon</div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg opacity-60">
                <div className="flex items-center space-x-2 mb-2">
                  <Palette className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium text-gray-700">Tip Jar</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">Accept tips with lowest fees</p>
                <div className="text-xs text-gray-500">Coming soon</div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg opacity-60">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium text-gray-700">Link Analytics</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">See your top links</p>
                <div className="text-xs text-gray-500">Coming soon</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* TikTok Preview Overlay */}
      {showTikTokPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">TikTok Preview</h3>
              <button
                onClick={() => setShowTikTokPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '375/667' }}>
              <iframe
                src={summary.fallbackUrl}
                className="w-full h-full border-0"
                title="TikTok Preview"
              />
            </div>
            <div className="mt-4 text-center">
              <Button
                onClick={() => setShowTikTokPreview(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardHomePage() {
  return (
    <ProtectedRoute requireUsername={true}>
      <DashboardHomeContent />
    </ProtectedRoute>
  );
}
