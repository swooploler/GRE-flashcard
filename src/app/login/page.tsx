'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Validates that a redirect URL is safe (relative path only)
 * Prevents open redirect attacks where malicious sites could be specified
 */
function isValidRedirect(url: string | null): boolean {
  if (!url) return false;
  // Only allow relative paths starting with /
  // Must not start with // (protocol-relative) or contain suspicious patterns
  return url.startsWith('/') && !url.startsWith('//') && !url.includes('\\');
}

function LoginForm() {
  const { signInWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate redirect URL to prevent open redirect attacks
  const redirectParam = searchParams.get('redirect');
  const isValid = isValidRedirect(redirectParam);
  const redirect = isValid && redirectParam ? redirectParam : '/dashboard';

  // Handle redirect after user is loaded
  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirect);
    }
  }, [user, authLoading, redirect, router]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      // Redirect will happen in useEffect
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#171717] border border-white/[0.06] mb-6">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2">
          GRE Flashcards
        </h1>
        <p className="text-zinc-500">
          Master vocabulary with AI-powered mnemonics
        </p>
      </div>

      {/* Login Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-[#171717]">
        <button
          onClick={handleSignIn}
          disabled={isLoading || authLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || authLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {error && (
          <p className="mt-4 text-center text-red-400 text-sm">{error}</p>
        )}

        <p className="mt-6 text-center text-zinc-500 text-xs">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Features */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-semibold text-white">AI-Powered</p>
          <p className="text-xs text-zinc-500 mt-1">Smart mnemonics</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">Real-time</p>
          <p className="text-xs text-zinc-500 mt-1">Sync across devices</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">Track Progress</p>
          <p className="text-xs text-zinc-500 mt-1">Master words</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0a]">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
