"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // This page is for legacy authentication verification
    // Redirect to login page for OTP authentication
    const redirect = searchParams.get("redirect") || "/dashboard";
    router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}

export default function AuthVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthVerifyContent />
    </Suspense>
  );
}