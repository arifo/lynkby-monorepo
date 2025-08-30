import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();
  const { token, redirect } = router.query;

  useEffect(() => {
    if (!token) {
      setError('No authentication token provided');
      setStatus('error');
      return;
    }

    const verifyToken = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';
        const response = await fetch(`${API_BASE}/v1/auth/verify?token=${encodeURIComponent(token as string)}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          // Cookie is set by API; redirect to dashboard or specified redirect path
          const redirectPath = (redirect as string) || '/dashboard';
          router.replace(redirectPath);
        } else {
          const errorData = await response.json().catch(() => ({}));
          const code = errorData.code as string | undefined;
          if (code === 'MAGIC_LINK_EXPIRED') setError('This magic link has expired.');
          else if (code === 'MAGIC_LINK_USED') setError('This magic link was already used.');
          else if (code === 'MAGIC_LINK_INVALID') setError('This magic link is invalid.');
          else setError(errorData.error || 'Authentication failed');
          setCanResend(!!errorData?.details?.canResend);
          setStatus('error');
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        setError('Failed to verify authentication');
        setStatus('error');
      }
    };

    verifyToken();
  }, [token, redirect, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Head>
          <title>Verifying... - Lynkby</title>
        </Head>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <h2 className="mt-6 text-xl font-medium text-gray-900">
              Verifying your sign-in link...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <Head>
          <title>Authentication Error - Lynkby</title>
        </Head>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-xl font-medium text-gray-900">
              Authentication Failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>

            <div className="mt-6 space-y-3">
              {canResend && (
                <button
                  onClick={() => router.push('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Send a new link
                </button>
              )}
              <button
                onClick={() => router.push('/login')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
