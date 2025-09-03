"use client";

import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    // Redirect to dashboard login page
    const dashboardLoginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    window.location.href = dashboardLoginUrl;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-custom flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Redirecting to Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Taking you to the dashboard login page...
          </p>
        </div>

        {/* Loading State */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-lg border border-gray-200">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-sm text-gray-600">
              If you are not redirected automatically,{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL}/login`}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                click here
              </a>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
