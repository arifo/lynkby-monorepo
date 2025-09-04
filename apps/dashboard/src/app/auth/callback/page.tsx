"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authAPI } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const [status, setStatus] = useState<"loading" | "verifying" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      // Extract token from URL using window.location
      const extractTokenFromURL = () => {
        if (typeof window === "undefined") {
          return { token: null, redirect: "/dashboard" };
        }

        try {
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get("token");
          const redirect = urlParams.get("redirect") || "/dashboard";

          // console.log("Extracted token:", token);
          // console.log("Extracted redirect:", redirect);

          return { token, redirect };
        } catch (err) {
          console.error("Failed to parse URL params:", err);
          return { token: null, redirect: "/dashboard" };
        }
      };

      const { token, redirect } = extractTokenFromURL();

      if (!token) {
        console.error("No token found in URL");
        setStatus("error");
        setError("No authentication token found");
        return;
      }

      // Set status to verifying once we have the token
      setStatus("verifying");

      // Verify the magic link token
      const verifyToken = async () => {
        try {
          setMessage("Verifying your magic link...");

          const response = await authAPI.verifyMagicLink(token);
          console.log("Verification response:", response);
          if (response.ok && response.user) {
            // Login the user
            login(response.user);

            setStatus("success");
            setMessage("Login successful! Redirecting...");

            // Redirect based on user status
            const redirectPath = response.user.username ? redirect : "/onboarding/username";

            setTimeout(() => {
              router.push(redirectPath);
            }, 500);
          } else {
            setStatus("error");
            setError((response as { error?: string }).error || "Invalid or expired magic link");
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
    }, 100); // Small delay to ensure component is mounted

    return () => clearTimeout(timer);
  }, [login, router]);

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

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-900">Verifying your magic link...</h3>
              <p className="text-gray-600">{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <button
                onClick={() => router.push("/login")}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
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
      <AuthCallbackContent />
    </Suspense>
  );
}
