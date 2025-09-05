"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { pagesAPI, setupAPI } from "@/lib/api";
import type { PageData } from "@lynkby/shared";
import { Copy, ExternalLink, Loader2, Plus, Trash2, X } from "lucide-react";
import { SuccessModal } from "@/components/ui/success-modal";

interface Link {
  id?: string;
  title: string;
  url: string;
  active: boolean;
  position: number;
}

const THEME_PRESETS = {
  classic: "Classic",
  contrast: "Contrast",
  warm: "Warm"
} as const;

const MAX_LINKS = 50;

export default function SetupPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState("classic");
  const [links, setLinks] = useState<Link[]>([]);

  // Route guards
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated && !user?.username) {
      router.replace("/onboarding/username");
      return;
    }
  }, [isAuthenticated, user?.username, router]);

  // Load page data
  useEffect(() => {
    if (!user?.username) return;

    const setResponse = (response: PageData) => {
      setPageData(response);
      setDisplayName(response.profile.displayName || "");
      setAvatarUrl(response.profile.avatarUrl || "");
      setBio(response.profile.bio || "");
      setTheme((response.page as { theme?: string }).theme || "classic");
      setLinks(response.links || []);
    }

    const loadPageData = async () => {
      try {
        setIsLoading(true);
        setError(null);



        // Create default page if it doesn't exist
        try {
          await setupAPI.setupDefaultPage();

          // Now try to get the page data again
          const response = await pagesAPI.getMyPage();
          if (response) {
            setResponse(response);
          } else {
            setError("Failed to load your page data after creation");
          }
        } catch (createErr) {
          setError("Failed to create your page");
          console.error("Error creating page:", createErr);
        }

        // // First try to get existing page data
        // try {
        //   const response = await pagesAPI.getMyPage();
        //   if (response) {
        //     setResponse(response);
        //     return;
        //   }
        // } catch {
        //   // If page doesn't exist (404), create it
        //   console.log("Page not found, creating default page...");
        // }
      } catch (err) {
        setError("Something went wrong loading your page");
        console.error("Error loading page data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [user?.username]);

  // Client-side validation
  const validateUrl = (url: string): string | null => {
    if (!url.trim()) return "URL is required";
    try {
      const parsed = new URL(url);
      if (!["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol)) {
        return "URL must start with https://, http://, mailto:, or tel:";
      }
      return null;
    } catch {
      return "Please enter a valid URL";
    }
  };

  const validateTitle = (title: string): string | null => {
    if (!title.trim()) return "Title is required";
    if (title.length > 80) return "Title must be 80 characters or less";
    return null;
  };

  const validateLinks = (): boolean => {
    const errors: Record<string, string> = {};

    if (links.length > MAX_LINKS) {
      errors.links = `Maximum ${MAX_LINKS} links allowed`;
    }

    links.forEach((link, index) => {
      const titleError = validateTitle(link.title);
      if (titleError) {
        errors[`link_${index}_title`] = titleError;
      }

      const urlError = validateUrl(link.url);
      if (urlError) {
        errors[`link_${index}_url`] = urlError;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addLink = () => {
    if (links.length >= MAX_LINKS) return;

    setLinks(prev => [...prev, {
      title: "",
      url: "",
      active: true,
      position: prev.length
    }]);
  };

  const updateLink = (index: number, field: keyof Link, value: string | boolean) => {
    setLinks(prev => prev.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    ));

    // Clear validation error for this field
    const errorKey = `link_${index}_${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index).map((link, i) => ({
      ...link,
      position: i
    })));
  };

  const copyLiveUrl = async () => {
    if (!pageData?.liveUrl) return;

    try {
      await navigator.clipboard.writeText(pageData.liveUrl);
      setSuccessMessage("Live URL copied to clipboard!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Failed to copy URL");
    }
  };

  const saveAll = async () => {
    if (!validateLinks()) {
      setError("Please fix validation errors before saving");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Update page metadata and profile
      const pageResponse = await pagesAPI.updateMyPage({
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
        bio: bio || undefined,
        theme,
        published: true
      });

      if (!pageResponse.ok) {
        throw new Error(pageResponse.error || "Failed to update page");
      }

      // Update links
      const linksResponse = await pagesAPI.bulkUpsertLinks(links);
      if (!linksResponse.ok) {
        throw new Error(linksResponse.error || "Failed to update links");
      }

      // Mark first save as completed
      try {
        await pagesAPI.markFirstSaveCompleted();
      } catch (err) {
        console.warn("Failed to mark first save completed:", err);
        // Don't fail the entire save if this fails
      }

      // Show success modal
      setShowSuccessModal(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToDashboard = () => {
    setShowSuccessModal(false);
    router.replace("/dashboard/home");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your page...</p>
        </div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <X className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        liveUrl={pageData?.liveUrl || `https://${user?.username}.lynkby.com`}
        username={user?.username || ""}
        onGoToDashboard={handleGoToDashboard}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Bar */}
        {pageData?.liveUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">Your page is live!</p>
                <p className="text-green-600 text-sm">{pageData.liveUrl}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyLiveUrl}
                  className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <a
                  href={pageData.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1 bg-white text-green-600 border border-green-600 rounded-md hover:bg-green-50 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Profile</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Avatar URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself..."
                    maxLength={280}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{bio.length}/280 characters</p>
                </div>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Theme</h2>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(THEME_PRESETS).map(([key, label]) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value={key}
                      checked={theme === key}
                      onChange={(e) => setTheme(e.target.value)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Links Editor */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Links</h2>
                <button
                  onClick={addLink}
                  disabled={links.length >= MAX_LINKS}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Link
                </button>
              </div>

              {validationErrors.links && (
                <p className="text-red-600 text-sm mb-4">{validationErrors.links}</p>
              )}

              <div className="space-y-4">
                {links.map((link, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) => updateLink(index, "title", e.target.value)}
                            placeholder="Link title"
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors[`link_${index}_title`] ? "border-red-500" : "border-gray-300"
                              }`}
                          />
                          {validationErrors[`link_${index}_title`] && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors[`link_${index}_title`]}</p>
                          )}
                        </div>

                        <div>
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => updateLink(index, "url", e.target.value)}
                            placeholder="https://example.com"
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors[`link_${index}_url`] ? "border-red-500" : "border-gray-300"
                              }`}
                          />
                          {validationErrors[`link_${index}_url`] && (
                            <p className="text-red-600 text-xs mt-1">{validationErrors[`link_${index}_url`]}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={link.active}
                              onChange={(e) => updateLink(index, "active", e.target.checked)}
                              className="text-blue-600"
                            />
                            <span className="text-sm">Active</span>
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={() => removeLink(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {links.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No links yet. Click &quot;Add Link&quot; to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="text-center mb-4">
                  {avatarUrl && (
                    <Image
                      src={avatarUrl}
                      alt={displayName || "Avatar"}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                    />
                  )}
                  <h3 className="font-semibold text-lg">{displayName || `@${user?.username}`}</h3>
                  {bio && <p className="text-sm text-gray-600 mt-1">{bio}</p>}
                </div>

                <div className="space-y-2">
                  {links.filter(link => link.active && link.title && link.url).map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-center font-medium hover:bg-gray-50"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg border p-6">
              <div className="space-y-3">
                <button
                  onClick={saveAll}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>

                {pageData?.liveUrl && (
                  <a
                    href={pageData.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 font-medium flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Live Page
                  </a>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center mt-3">
                Changes appear within ~60s
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
