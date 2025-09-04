"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { authAPI } from "@/lib/api";
import { Link as LinkIcon, Mail, ArrowLeft, CheckCircle, Smartphone, Key, Clock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown] = useState(0);

  // Handoff pattern state
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [handshakeNonce, setHandshakeNonce] = useState<string | null>(null);

  const [isPolling, setIsPolling] = useState(false);
  const [pollingError, setPollingError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const router = useRouter();

  const { isAuthenticated, login } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setMessage("");
    setPollingError("");

    try {
      // Use the new handoff pattern
      const response = await authAPI.createLoginRequest(email, "/dashboard");
      if (response.ok) {
        setRequestId(response.requestId);
        if (response.handshakeNonce) {
          setHandshakeNonce(response.handshakeNonce);
        }
        setIsSuccess(true);
        setMessage("Check your email for the magic link or use the 6-digit code.");
        setTimeLeft(15 * 60); // 15 minutes in seconds
        // Prefer SSE; fall back to polling if not supported
        if (typeof window !== 'undefined' && 'EventSource' in window) {
          startSSE(response.requestId);
        } else {
          startPolling(response.requestId);
        }
      } else {
        setMessage(response.error || "Failed to create login request. Please try again.");
        setIsSuccess(false);
      }
    } catch (error: unknown) {
      console.error("Login request failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error &&
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to create login request. Please try again.";
      setMessage(errorMessage);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // SSE logic for handoff pattern (preferred)
  const startSSE = (reqId: string) => {
    setIsPolling(true);
    setPollingError("");

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${base?.replace(/\/$/, "")}/v1/auth/wait?requestId=${encodeURIComponent(reqId)}`;
      // Ask for credentials so the worker can correlate if needed
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.addEventListener("status", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.status === "completed") {
            finalizeLogin(reqId);
          } else if (data.status === "expired") {
            setPollingError("Login request expired. Please try again.");
            stopSSE();
          }
        } catch { }
      });

      es.addEventListener("completed", () => {
        finalizeLogin(reqId);
      });

      es.addEventListener("expired", () => {
        setPollingError("Login request expired. Please try again.");
        stopSSE();
      });

      es.addEventListener("error", () => {
        // Network/CORS issue; fall back to polling
        stopSSE();
        startPolling(reqId);
      });
    } catch (err) {
      console.error("SSE init failed, falling back to polling", err);
      stopSSE();
      startPolling(reqId);
    }
  };

  const stopSSE = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsPolling(false);
  };

  // Polling logic for handoff pattern (fallback)
  const startPolling = (requestId: string) => {
    setIsPolling(true);
    setPollingError("");

    const poll = async () => {
      try {
        const response = await authAPI.waitForLoginRequest(requestId);
        if (response.ok && response.status === "completed") {
          // Login request completed, finalize it
          await finalizeLogin(requestId);
        } else if (response.ok && response.status === "expired") {
          setPollingError("Login request expired. Please try again.");
          stopPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
        setPollingError("Connection error. Please check your internet connection.");
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    pollingRef.current = setInterval(poll, 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  };

  const finalizeLogin = async (requestId: string) => {
    try {
      const nonce = handshakeNonce;
      const response = await authAPI.finalizeLoginRequest(requestId, nonce || "");
      if (response.ok) {
        // Login successful, update auth state
        await login(response.user);
        router.push("/dashboard");
      } else {
        setPollingError(response.error || "Failed to complete login. Please try again.");
      }
    } catch (error) {
      console.error("Finalize login error:", error);
      setPollingError("Failed to complete login. Please try again.");
    } finally {
      stopPolling();
      stopSSE();
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !code) return;

    setIsLoading(true);
    try {
      const response = await authAPI.verifyCode(requestId, code);
      if (response.ok && (response as { status?: string }).status === "completed") {
        // Code verified, finalize login
        await finalizeLogin(requestId);
      } else {
        setMessage("Invalid code. Please try again.");
      }
    } catch (error) {
      console.error("Code verification error:", error);
      setMessage("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, []);

  // Timer for countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && requestId) {
      // Time expired, stop polling
      stopPolling();
      setPollingError("Login request expired. Please try again.");
    }
    return () => clearTimeout(timer);
  }, [timeLeft, requestId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Lynkby</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in to Lynkby</h1>
          <p className="text-gray-600">We&apos;ll email you a secure magic link to continue</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-md text-sm ${isSuccess
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={!email || isLoading || cooldown > 0}
              >
                {isLoading ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown} seconds` : "Send magic link"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isPolling ? (
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
                <p className="text-gray-600">
                  We&apos;ve sent a magic link to <strong>{email}</strong>
                </p>
                {timeLeft > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>

              {/* Error Messages */}
              {pollingError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-sm text-red-700">{pollingError}</p>
                  </div>
                </div>
              )}

              {/* 6-Digit Code Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Key className="w-5 h-5 text-gray-600 mr-2" />
                  <h4 className="font-medium text-gray-900">Can&apos;t use the magic link?</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Enter the 6-digit code from your email:
                </p>

                <form onSubmit={handleCodeSubmit} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                  <Button
                    type="submit"
                    disabled={code.length !== 6 || isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                </form>
              </div>

              {/* Mobile Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Smartphone className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">Using mobile email app?</h4>
                    <p className="text-sm text-yellow-700">
                      If you&apos;re using Gmail, Outlook, or another email app on your phone:
                    </p>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                      <li>• Tap the magic link in your email</li>
                      <li>• Look for &quot;Open in browser&quot; or &quot;Open externally&quot;</li>
                      <li>• Or use the 6-digit code above instead</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Polling Status */}
              {isPolling && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Waiting for you to click the magic link...
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    stopPolling();
                    stopSSE();
                    setIsSuccess(false);
                    setMessage("");
                    setRequestId(null);
                    setCode("");
                    setHandshakeNonce(null);
                    setPollingError("");
                    setTimeLeft(0);
                  }}
                  className="w-full"
                >
                  Try a different email
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              Get started
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
