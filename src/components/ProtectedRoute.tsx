'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, ReactNode, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

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

function ProtectedRouteContent({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      // Validate redirect URL to prevent open redirect attacks
      const redirectParam = searchParams.get('redirect');
      const isValid = isValidRedirect(redirectParam);
      const redirectUrl = isValid && redirectParam ? redirectParam : '/dashboard';
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  }, [user, loading, router, pathname, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <ProtectedRouteContent>{children}</ProtectedRouteContent>
    </Suspense>
  );
}
