"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authAPI } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

// Detect if the user is in a webview (mobile app browser)
function detectWebView(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();

  // Specific webview indicators (excluding regular browsers)
  const webViewIndicators = [
    'wv', // Android WebView
    'webview', // Generic webview
    'fbav', // Facebook app browser
    'fban', // Facebook app browser
    'fbsv', // Facebook app browser
    'line', // LINE app browser
    'micromessenger', // WeChat
    'qq/', // QQ browser
    'mqqbrowser', // QQ browser
    'baiduboxapp', // Baidu app
    'baidubrowser', // Baidu browser
    'ucbrowser', // UC Browser
    'sogoumobilebrowser', // Sogou browser
    'instagram', // Instagram app
    'twitter', // Twitter app
    'linkedinapp', // LinkedIn app
    'whatsapp', // WhatsApp
    'telegram', // Telegram
    'snapchat', // Snapchat
    'tiktok', // TikTok
    'pinterest', // Pinterest
    'reddit', // Reddit
    'discord', // Discord
    'slack', // Slack
    'zoom', // Zoom
    'teams', // Microsoft Teams
    'skype', // Skype
    'viber', // Viber
    'kakaotalk', // KakaoTalk
    'naver', // Naver
  ];

  // Check if it's a webview
  const isWebViewUA = webViewIndicators.some(indicator => userAgent.includes(indicator));

  // Additional checks for mobile webviews
  const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const hasStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const hasTouch = 'ontouchstart' in window;

  // If it's mobile and has touch but not standalone, likely a webview
  const isMobileWebView = isMobile && hasTouch && !hasStandalone;

  return isWebViewUA || isMobileWebView;
}

function AuthVerifyContent() {
  const [status, setStatus] = useState<"loading" | "detecting" | "verifying" | "success" | "webview-success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWebView, setIsWebView] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      // First, detect if we're in a webview
      setStatus("detecting");
      setMessage("Detecting your browser...");

      const webView = detectWebView();
      setIsWebView(webView);

      // Always proceed with verification, but handle differently based on webview detection
      setStatus("verifying");
      setMessage("Verifying your magic link...");

      // Extract token and requestId from URL
      const extractParamsFromURL = () => {
        if (typeof window === "undefined") {
          return { token: null, requestId: null, redirect: "/dashboard" };
        }

        try {
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get("token");
          const requestId = urlParams.get("requestId");
          const redirect = urlParams.get("redirect") || "/dashboard";

          return { token, requestId, redirect };
        } catch (err) {
          console.error("Failed to parse URL params:", err);
          return { token: null, requestId: null, redirect: "/dashboard" };
        }
      };

      const { token, redirect } = extractParamsFromURL();

      if (!token) {
        console.error("No token found in URL");
        setStatus("error");
        setError("No authentication token found");
        return;
      }

      // Verify the magic link token
      const verifyToken = async () => {
        try {
          const response = await authAPI.verifyMagicLink(token);
          console.log("Verification response:", response);

          if (response.ok && response.user) {
            // Login the user
            login(response.user);

            // Handle success differently based on webview detection
            if (webView) {
              setStatus("webview-success");
              setMessage("Authentication successful! You can close this page now.");
            } else {
              setStatus("success");
              setMessage("Login successful! Redirecting...");

              // Redirect based on user status
              const redirectPath = response.user.username ? redirect : "/onboarding/username";

              setTimeout(() => {
                router.push(redirectPath);
              }, 1500);
            }
          } else {
            setStatus("error");
            setError(response.error || "Invalid or expired magic link");
          }
        } catch (err: unknown) {
          console.error("Magic link verification failed:", err);
          setStatus("error");
          const errorMessage = err && typeof err === 'object' && 'response' in err &&
            err.response && typeof err.response === 'object' && 'data' in err.response &&
            err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data
            ? String(err.response.data.error)
            : "Failed to verify magic link";
          setError(errorMessage);
        }
      };

      verifyToken();
    }, 100);

    return () => clearTimeout(timer);
  }, [login, router, isWebView]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Loading...</h3>
              <p className="text-gray-600">Preparing authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detecting browser state
  if (status === "detecting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Detecting Browser</h3>
              <p className="text-gray-600">{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // Verifying state
  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Verifying Magic Link</h3>
              <p className="text-gray-600">{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Welcome back!</h3>
              <p className="text-gray-600">{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Webview success state
  if (status === "webview-success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Complete!</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-green-800 mb-2">What to do next:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Close this tab or window</li>
                  <li>• Return to your main browser</li>
                  <li>• You should now be logged in</li>
                </ul>
              </div>

              {/* Additional help */}
              <div className="text-xs text-gray-500">
                <p>If you&apos;re still not logged in, try refreshing the page in your main browser.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Authentication Failed</h3>
              <p className="text-gray-600">{error}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Back to Login
                </Link>
                <p className="text-xs text-gray-500">
                  Try requesting a new magic link or use the 6-digit code from your email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Loading...</h3>
              <p className="text-gray-600">Preparing authentication...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <AuthVerifyContent />
    </Suspense>
  );
}
