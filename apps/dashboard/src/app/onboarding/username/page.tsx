"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usernameAPI } from "@/lib/api";
import { z } from "zod";
import { Check, X, Loader2 } from "lucide-react";

// Client-side validation mirrors server regex and extra checks
const USERNAME_REGEX = /^(?!xn--)[a-z](?:[a-z0-9-]{1,18}[a-z0-9])$/;
const UsernameSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => USERNAME_REGEX.test(v), {
    message: "INVALID_FORMAT",
  })
  .refine((v) => !v.includes("--"), { message: "INVALID_FORMAT" });

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function generateSuggestions(seed: string): string[] {
  const s = (seed || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!s) return [];
  const pool = [
    s,
    `${s}1`,
    `${s}hq`,
    `its${s}`,
    `real${s}`,
    `the${s}`,
    `${s}-io`.replace(/[^a-z0-9-]/g, ""),
    `${s}777`,
  ];
  // Deduplicate and cap
  const out: string[] = [];
  for (const p of pool) {
    const nm = p.replace(/[^a-z0-9-]/g, "");
    if (!out.includes(nm)) out.push(nm);
    if (out.length >= 6) break;
  }
  return out;
}

export default function ChooseUsernamePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "typing" | "checking" | "available" | "unavailable" | "error">("idle");
  const [hint, setHint] = useState<string>("");
  const [lastChecked, setLastChecked] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const ariaLiveRef = useRef<HTMLDivElement>(null);

  // Route guards
  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
    else console.log("Analytics: Onboarding Username Viewed", { auth_provider: "magic_link", ts: Date.now() });
  }, [isAuthenticated, router]);
  useEffect(() => {
    if (user?.username) router.replace("/dashboard");
  }, [user?.username, router]);

  const seed = useMemo(() => {
    const email = user?.email as string | undefined;
    const local = email?.split("@")[0] || "";
    return user?.username || local || "";
  }, [user]);
  const suggestions = useMemo(() => generateSuggestions(seed), [seed]);

  const debounced = useDebounced(value, 300);

  const check = useCallback(async (candidate: string) => {
    console.log("Analytics: Username Availability Checked — start");
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) {
      setStatus("idle");
      setHint("");
      return;
    }
    const parse = UsernameSchema.safeParse(normalized);
    if (!parse.success) {
      setStatus("unavailable");
      const msg = parse.error.issues[0]?.message;
      setHint(
        msg === "INVALID_FORMAT"
          ? "3–20 chars. Start with a letter. Letters, numbers, hyphens."
          : "Invalid username"
      );
      return;
    }
    setStatus("checking");
    setHint("Checking…");
    try {
      const res = await usernameAPI.check(normalized);
      setLastChecked(normalized);
      if (!res.valid) {
        setStatus("unavailable");
        setHint("Invalid format");
        console.log("Analytics: Username Availability Checked", { valid: false, available: false, reason: "INVALID_FORMAT" });
        return;
      }
      if (res.available) {
        setStatus("available");
        setHint("Nice — it’s available.");
        console.log("Analytics: Username Availability Checked", { valid: true, available: true });
      } else {
        setStatus("unavailable");
        setHint(res.reasons?.includes("RESERVED") ? "Reserved. Try another." : "Already taken. Try another or pick a suggestion.");
        console.log("Analytics: Username Availability Checked", { valid: true, available: false, reason: res.reasons?.[0] });
      }
    } catch (e) {
      setStatus("error");
      setHint("Network error. Please retry.");
      setToast("We hit a snag checking availability.");
    }
  }, []);

  // Debounced check
  useEffect(() => {
    if (!debounced) return;
    setStatus("typing");
    check(debounced);
  }, [debounced, check]);

  const onBlur = () => {
    const normalized = value.trim().toLowerCase();
    if (normalized && normalized !== lastChecked) check(normalized);
  };

  const isCTAEnabled = status === "available";

  const onSuggestion = (s: string) => {
    setValue(s);
    setTimeout(() => check(s), 0);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCTAEnabled) return;
    try {
      console.log("Analytics: Username Claimed", { username_len: value.length, contains_dash: value.includes("-") });
      const res = await usernameAPI.claim(value);
      if (res.ok) {
        console.log("Analytics: Onboarding Completed", { path: "username" });
        router.replace("/dashboard");
      } else {
        if (res.error === "TAKEN") {
          setStatus("unavailable");
          setHint("Already taken. Try another or pick a suggestion.");
        } else {
          setStatus("unavailable");
          setHint("Invalid or reserved username.");
        }
      }
    } catch (err) {
      setStatus("error");
      setHint("Something went wrong.");
      setToast("Couldn’t claim username. Please retry.");
    }
  };

  useEffect(() => {
    if (ariaLiveRef.current && (status === "available" || status === "unavailable")) {
      ariaLiveRef.current.textContent = status === "available" ? "Available" : "Taken";
    }
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-md">
        <header className="mb-6">
          <h1 className="text-xl font-semibold">Claim your @username</h1>
          <p className="text-sm text-gray-600 mt-1">This becomes your page: username.lynkby.com and lynkby.com/u/username</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4" aria-describedby="username-hint username-status">
          <label htmlFor="username" className="block text-sm font-medium">Pick your @username</label>
          <div className={`flex items-center rounded-md border ${status === "unavailable" ? "border-red-500" : status === "available" ? "border-green-500" : "border-gray-300"} focus-within:ring-2 focus-within:ring-blue-600`}
          >
            <span className="px-3 text-gray-500 select-none">@</span>
            <input
              id="username"
              type="text"
              value={value}
              onChange={(e) => { const v = e.target.value.toLowerCase(); setValue(v); console.log("Analytics: Username Input Changed", { length: v.length, has_dash: v.includes("-") }); }}
              onBlur={onBlur}
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={status === "unavailable"}
              aria-describedby="username-hint username-status"
              className="flex-1 h-12 text-base outline-none bg-transparent"
              placeholder="yourname"
            />
            <div className="px-3">
              {status === "checking" ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              ) : status === "available" ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : status === "unavailable" ? (
                <X className="w-5 h-5 text-red-600" />
              ) : null}
            </div>
          </div>
          <p id="username-hint" className="text-sm text-gray-600">3–20 characters. Lowercase letters and numbers. Start with a letter.</p>
          <div id="username-status" className={`text-sm ${status === "unavailable" ? "text-red-600" : status === "available" ? "text-green-600" : "text-gray-500"}`}>{hint}</div>
          <div aria-live="polite" aria-atomic="true" className="sr-only" ref={ariaLiveRef} />

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSuggestion(s)}
                  className="px-3 h-11 rounded-full border border-gray-300 hover:border-gray-400 active:scale-95"
                  aria-label={`Use suggestion ${s}`}
                >
                  @{s}
                </button>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={!isCTAEnabled}
            className={`w-full h-12 rounded-md text-white font-medium ${isCTAEnabled ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300"}`}
            aria-disabled={!isCTAEnabled}
          >
            Continue
          </button>
          <p className="text-xs text-gray-500 text-center">You can’t change this later</p>
        </form>

        {toast && (
          <div role="status" className="mt-4 text-sm text-red-600">{toast}</div>
        )}
      </div>
    </div>
  );
}
