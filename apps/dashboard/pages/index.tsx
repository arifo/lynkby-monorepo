import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';
import Head from 'next/head';

export default function AppHome() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Head>
          <title>Loading... - Lynkby</title>
        </Head>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return null;
}
