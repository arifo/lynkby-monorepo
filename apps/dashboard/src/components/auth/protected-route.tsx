"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireUsername?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireUsername = false,
  redirectTo = "/login"
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Redirect if not authenticated
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // Redirect if username is required but user doesn't have one
      if (requireUsername && user && !user.username) {
        router.push("/onboarding/username");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requireUsername, redirectTo, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render children if username is required but user doesn't have one
  if (requireUsername && user && !user.username) {
    return null;
  }

  return <>{children}</>;
}
