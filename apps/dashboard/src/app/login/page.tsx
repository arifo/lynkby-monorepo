"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { authAPI } from "@/lib/api";
import { Link as LinkIcon, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();

  const { isAuthenticated } = useAuth();

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

    try {
      const response = await authAPI.sendMagicLink(email, "/dashboard");
      if (response.ok) {
        setIsSuccess(true);
        setMessage(response.message || "Magic link sent! Check your email.");
        setCooldown(response.cooldown || 60);
      } else {
        setMessage(response.error || "Failed to send magic link. Please try again.");
        setIsSuccess(false);
      }
    } catch (error: unknown) {
      console.error("Magic link request failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error &&
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to send magic link. Please try again.";
      setMessage(errorMessage);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (cooldown > 0) {
      timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

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
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Check your email</h3>
              <p className="text-gray-600">
                We&apos;ve sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Click the link in your email to sign in. The link will expire in 15 minutes and redirect you to the dashboard.
              </p>

              <div className="pt-4">
                <Button
                  variant="outline"
                  disabled={cooldown > 0}
                  onClick={() => {
                    if (cooldown > 0) return;
                    setIsSuccess(false);
                    setMessage("");
                    setCooldown(60);
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown} seconds` : "Send another link"}
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
