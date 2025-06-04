
"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Assuming lucide-react is used for icons

const ADMIN_LOGIN_SESSION_KEY = 'adminLoginSessionDropAquaTrackApp';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let sessionChecked = false;
    try {
      const storedAdminSession = sessionStorage.getItem(ADMIN_LOGIN_SESSION_KEY);
      if (storedAdminSession) {
        const session = JSON.parse(storedAdminSession);
        if (session.isLoggedIn && session.currentUserRole === 'Admin') {
          setIsAuthorized(true);
        } else {
          // Invalid or non-admin session
          sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY);
          router.replace('/'); 
        }
      } else {
        // No admin session
        router.replace('/'); 
      }
    } catch (error) {
      console.error("Error reading admin session:", error);
      sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY);
      router.replace('/'); 
    } finally {
      sessionChecked = true;
      setIsLoading(false);
    }

    // Fallback if redirect somehow didn't happen during initial evaluation in effect
    if (sessionChecked && !isAuthorized && router.pathname?.startsWith('/admin')) {
        // router.replace('/'); // This might cause issues if component unmounts before redirect completes
    }

  }, [router, isAuthorized]); // Added isAuthorized to dependencies to re-evaluate if it changes externally, though unlikely here.

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    // This state should ideally not be reached for long if router.replace works promptly.
    // It acts as a final gate before rendering children if authorization fails.
    // Depending on Next.js behavior, router.replace might cause an unmount,
    // so rendering null or a loader here might be brief or not seen.
    return (
         <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-destructive" />
            <p className="ml-4 text-destructive">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
