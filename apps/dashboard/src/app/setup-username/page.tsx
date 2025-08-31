"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { authAPI } from "@/lib/api";
import { Link as LinkIcon, User, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

export default function SetupUsernamePage() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const router = useRouter();
  const { user, setupUsername, isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Redirect if user already has a username
  useEffect(() => {
    if (user && user.username && !user.isNewUser) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const checkUsernameAvailability = async (value: string) => {
    if (value.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const response = await authAPI.checkUsernameAvailability(value);
      if (response.ok) {
        setIsAvailable(response.available);
        setMessage(response.available ? "" : response.reason || "Username is already taken");
      } else {
        setIsAvailable(false);
        setMessage("Failed to check username availability");
      }
    } catch (error: unknown) {
      console.error("Username check failed:", error);
      setIsAvailable(false);
      setMessage("Failed to check username availability");
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setMessage("");
    setIsAvailable(null);

    // Debounce username availability check
    const timeoutId = setTimeout(() => {
      if (value.length >= 3) {
        checkUsernameAvailability(value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !isAvailable) return;

    setIsLoading(true);
    setMessage("");

    try {
      await setupUsername(username);
      setIsSuccess(true);
      setMessage("Username set successfully! Redirecting to dashboard...");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error: unknown) {
      console.error("Username setup failed:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error &&
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to set username. Please try again.";
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getUsernameStatus = () => {
    if (username.length === 0) return null;
    if (username.length < 3) return "too-short";
    if (isChecking) return "checking";
    if (isAvailable === true) return "available";
    if (isAvailable === false) return "unavailable";
    return null;
  };

  const getStatusIcon = () => {
    const status = getUsernameStatus();
    switch (status) {
      case "checking":
        return <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />;
      case "available":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "unavailable":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    const status = getUsernameStatus();
    switch (status) {
      case "too-short":
        return "Username must be at least 3 characters";
      case "checking":
        return "Checking availability...";
      case "available":
        return "Username is available!";
      case "unavailable":
        return message || "Username is unavailable";
      default:
        return "";
    }
  };

  const getStatusColor = () => {
    const status = getUsernameStatus();
    switch (status) {
      case "available":
        return "text-green-600";
      case "unavailable":
        return "text-red-600";
      case "checking":
        return "text-blue-600";
      default:
        return "text-gray-500";
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Lynkby!</h3>
            <p className="text-gray-600 mb-4">
              Your username <strong>@{username}</strong> has been set successfully.
            </p>
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Lynkby</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Set Your Username</h1>
          <p className="text-gray-600">
            Choose a unique username for your profile. This will be your public URL.
          </p>
        </div>

        {/* Username Setup Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_-]+"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {getStatusIcon()}
                </div>
              </div>

              {/* Username status */}
              {username.length > 0 && (
                <div className={`text-sm mt-2 flex items-center space-x-2 ${getStatusColor()}`}>
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </div>
              )}

              {/* Username requirements */}
              <div className="text-xs text-gray-500 mt-2">
                <p>• 3-30 characters long</p>
                <p>• Letters, numbers, hyphens, and underscores only</p>
                <p>• Must be unique</p>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${message.includes("successfully")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!username || !isAvailable || isLoading}
            >
              {isLoading ? "Setting username..." : "Continue to Dashboard"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Your username will be used for your public profile at{" "}
            <span className="font-mono text-blue-600">lynkby.com/@{username || "username"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
