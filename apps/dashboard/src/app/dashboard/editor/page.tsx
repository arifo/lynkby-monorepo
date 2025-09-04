"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { pagesAPI } from "@/lib/api";

type LinkItem = { id?: string; title: string; url: string; active: boolean; position?: number };

const THEME_PRESETS = {
  classic: { name: "Classic", description: "Clean and minimal" },
  contrast: { name: "Contrast", description: "High contrast for accessibility" },
  warm: { name: "Warm", description: "Warm and friendly tones" }
} as const;

const VALID_URL_SCHEMES = ['https:', 'mailto:', 'tel:'];

function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { isValid: false, error: "URL is required" };
  }

  try {
    const parsedUrl = new URL(url);
    if (!VALID_URL_SCHEMES.includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: `URL must start with ${VALID_URL_SCHEMES.join(', ')}`
      };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}

function validateTitle(title: string): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: "Title is required" };
  }
  if (title.length > 80) {
    return { isValid: false, error: "Title must be no more than 80 characters" };
  }
  return { isValid: true };
}

export default function EditorPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [published, setPublished] = useState(true);
  const [theme, setTheme] = useState<keyof typeof THEME_PRESETS>("classic");
  const [links, setLinks] = useState<LinkItem[]>([]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const liveUrl = useMemo(() => (user?.username ? `https://${user.username}.lynkby.com` : undefined), [user?.username]);
  const fallbackUrl = useMemo(() => (user?.username ? `https://lynkby.com/u/${user.username}` : undefined), [user?.username]);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await pagesAPI.getMyPage();
        setDisplayName(data.profile?.displayName || "");
        setAvatarUrl(data.profile?.avatarUrl || "");
        setBio(data.profile?.bio || "");
        setTheme((data.page?.theme as keyof typeof THEME_PRESETS) || "classic");
        setLinks(
          (data.links || []).map(l => ({ id: l.id, title: l.title, url: l.url, active: l.active !== false }))
        );
      } catch {
        setError("Failed to load page data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addLink = () => setLinks(prev => [...prev, { title: "", url: "https://", active: true }]);
  const removeLink = (idx: number) => setLinks(prev => prev.filter((_, i) => i !== idx));
  const updateLink = (idx: number, patch: Partial<LinkItem>) =>
    setLinks(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const validateLinks = (): boolean => {
    const errors: Record<string, string> = {};

    if (links.length > 50) {
      errors.links = "Maximum 50 links allowed";
    }

    links.forEach((link, index) => {
      const titleValidation = validateTitle(link.title);
      if (!titleValidation.isValid) {
        errors[`link-${index}-title`] = titleValidation.error!;
      }

      const urlValidation = validateUrl(link.url);
      if (!urlValidation.isValid) {
        errors[`link-${index}-url`] = urlValidation.error!;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const saveAll = async () => {
    if (!validateLinks()) {
      setSaveMsg("Please fix validation errors before saving");
      return;
    }

    setSaving(true);
    setSaveMsg(null);
    try {
      await pagesAPI.updateMyPage({ displayName, avatarUrl, bio, published, theme });
      const normalized = links.map((l, i) => ({
        id: l.id,
        title: l.title.trim(),
        url: l.url.trim(),
        active: !!l.active,
        position: i
      }));
      await pagesAPI.bulkUpsertLinks(normalized);
      await pagesAPI.publish();
      setSaveMsg("Saved. Changes appear within ~60s.");
    } catch (e: unknown) {
      setSaveMsg((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Save failed. Please check fields and retry.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading editor…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Edit Your Page</h1>
          <div className="space-x-2 text-sm">
            {liveUrl && (
              <a className="text-blue-600 hover:underline" href={liveUrl} target="_blank" rel="noreferrer">View live</a>
            )}
            {fallbackUrl && (
              <a className="text-blue-600 hover:underline" href={fallbackUrl} target="_blank" rel="noreferrer">Fallback</a>
            )}
          </div>
        </header>

        {/* Success bar */}
        {user?.username && (
          <div className="mb-4 text-sm bg-green-50 border border-green-200 rounded p-3">
            Your page is live → {" "}
            <button
              className="text-green-700 underline"
              onClick={() => navigator.clipboard.writeText(liveUrl!)}
            >
              {liveUrl}
            </button>
          </div>
        )}

        {/* Profile Card */}
        <section className="bg-gray-50 border rounded p-4 mb-6">
          <h2 className="font-medium mb-3">Profile</h2>
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm">
              Avatar URL
              <input
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                className="mt-1 w-full border rounded p-2"
                placeholder="https://..."
              />
            </label>
            <label className="text-sm">
              Display Name *
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="mt-1 w-full border rounded p-2"
                placeholder="Your name"
                required
              />
            </label>
            <label className="text-sm">
              Bio
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="mt-1 w-full border rounded p-2"
                placeholder="Short bio (max 280 characters)"
                maxLength={280}
              />
              <div className="text-xs text-gray-500 mt-1">{bio.length}/280</div>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
              Published
            </label>
          </div>
        </section>

        {/* Theme Selection */}
        <section className="bg-gray-50 border rounded p-4 mb-6">
          <h2 className="font-medium mb-3">Theme</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <label key={key} className={`border rounded p-3 cursor-pointer ${theme === key ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                <input
                  type="radio"
                  name="theme"
                  value={key}
                  checked={theme === key}
                  onChange={e => setTheme(e.target.value as keyof typeof THEME_PRESETS)}
                  className="sr-only"
                />
                <div className="font-medium">{preset.name}</div>
                <div className="text-sm text-gray-600">{preset.description}</div>
              </label>
            ))}
          </div>
        </section>

        {/* Links Editor */}
        <section className="bg-gray-50 border rounded p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Links</h2>
            <button
              className="text-sm px-3 py-2 rounded border bg-white hover:bg-gray-50"
              onClick={addLink}
              disabled={links.length >= 50}
            >
              Add Link {links.length >= 50 && "(Max 50)"}
            </button>
          </div>
          {validationErrors.links && (
            <div className="text-sm text-red-600 mb-3">{validationErrors.links}</div>
          )}
          <div className="space-y-3">
            {links.map((l, i) => (
              <div key={i} className="bg-white border rounded p-3">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start">
                  <div className="md:col-span-2">
                    <input
                      className={`w-full border rounded p-2 ${validationErrors[`link-${i}-title`] ? 'border-red-500' : ''}`}
                      placeholder="Title *"
                      value={l.title}
                      onChange={e => updateLink(i, { title: e.target.value })}
                    />
                    {validationErrors[`link-${i}-title`] && (
                      <div className="text-xs text-red-600 mt-1">{validationErrors[`link-${i}-title`]}</div>
                    )}
                  </div>
                  <div className="md:col-span-3">
                    <input
                      className={`w-full border rounded p-2 ${validationErrors[`link-${i}-url`] ? 'border-red-500' : ''}`}
                      placeholder="https://example.com"
                      value={l.url}
                      onChange={e => updateLink(i, { url: e.target.value })}
                    />
                    {validationErrors[`link-${i}-url`] && (
                      <div className="text-xs text-red-600 mt-1">{validationErrors[`link-${i}-url`]}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm flex items-center gap-1">
                      <input type="checkbox" checked={l.active} onChange={e => updateLink(i, { active: e.target.checked })} />
                      Active
                    </label>
                    <button className="text-sm text-red-600 hover:text-red-800" onClick={() => removeLink(i)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {links.length === 0 && <div className="text-sm text-gray-600">No links yet. Click &quot;Add Link&quot;.</div>}
          </div>
        </section>

        {/* Publish Bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Changes appear within ~60s</div>
          <button
            onClick={saveAll}
            disabled={saving}
            className={`px-4 py-2 rounded text-white ${saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {saveMsg && (
          <div className={`mt-3 text-sm ${saveMsg.includes('Saved') ? 'text-green-600' : 'text-red-600'}`}>
            {saveMsg}
          </div>
        )}
      </div>
    </div>
  );
}