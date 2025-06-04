
"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@/lib/types'; // Assuming UserRole is 'Admin' | 'TeamLeader'

const ADMIN_LOGIN_SESSION_KEY = 'adminLoginSessionDropAquaTrackApp';
const LOGIN_SESSION_KEY = 'loginSessionDropAquaTrackApp'; // For TeamLeaders

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    console.log('[AdminLayout] useEffect triggered.');
    let sessionIsValid = false;
    let detectedRole: UserRole | null = null;

    try {
      // Check for Admin session first (sessionStorage)
      const storedAdminSession = sessionStorage.getItem(ADMIN_LOGIN_SESSION_KEY);
      console.log('[AdminLayout] Attempting to load Admin session from sessionStorage. Found:', !!storedAdminSession);
      if (storedAdminSession) {
        const session = JSON.parse(storedAdminSession);
        console.log('[AdminLayout] Parsed Admin session:', session);
        if (session.isLoggedIn && session.currentUserRole === 'Admin') {
          console.log('[AdminLayout] Valid Admin session found.');
          sessionIsValid = true;
          detectedRole = 'Admin';
        } else {
          console.log('[AdminLayout] Admin session found but invalid (isLoggedIn:', session.isLoggedIn, ', role:', session.currentUserRole, ')');
        }
      }

      // If no valid Admin session, check for TeamLeader session (localStorage)
      if (!sessionIsValid) {
        console.log('[AdminLayout] No valid Admin session. Checking for TeamLeader session from localStorage.');
        const storedTlSession = localStorage.getItem(LOGIN_SESSION_KEY);
        console.log('[AdminLayout] Attempting to load TeamLeader session from localStorage. Found:', !!storedTlSession);
        if (storedTlSession) {
          const session = JSON.parse(storedTlSession);
          console.log('[AdminLayout] Parsed TeamLeader session:', session);
          // A TeamLeader session should specifically have the 'TeamLeader' role.
          if (session.isLoggedIn && session.currentUserRole === 'TeamLeader') {
            console.log('[AdminLayout] Valid TeamLeader session found.');
            sessionIsValid = true;
            detectedRole = 'TeamLeader';
          } else {
            console.log('[AdminLayout] TeamLeader session found but invalid (isLoggedIn:', session.isLoggedIn, ', role:', session.currentUserRole, ')');
          }
        } else {
            console.log('[AdminLayout] No TeamLeader session found in localStorage.');
        }
      }

      if (sessionIsValid) {
        console.log('[AdminLayout] Authorization successful. Detected role:', detectedRole);
        setIsAuthorized(true);
      } else {
        console.log('[AdminLayout] Authorization failed. Clearing sessions and redirecting to login.');
        // No valid session or invalid role, clear both and redirect
        sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY);
        localStorage.removeItem(LOGIN_SESSION_KEY); // Also clear TL session just in case
        router.replace('/');
      }
    } catch (error) {
      console.error("[AdminLayout] Error reading or parsing session:", error);
      sessionStorage.removeItem(ADMIN_LOGIN_SESSION_KEY);
      localStorage.removeItem(LOGIN_SESSION_KEY);
      router.replace('/');
    } finally {
      console.log('[AdminLayout] Setting isLoading to false. Current isAuthorized state:', isAuthorized); // Log state before it might change due to re-render
      setIsLoading(false);
    }
  }, [router]); // Only run on mount and route changes

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying access to admin area...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    // This state should ideally not be reached for long if router.replace works promptly.
    // It acts as a final gate before rendering children if authorization fails.
     console.log('[AdminLayout] Render: Not authorized, showing redirecting message.');
    return (
         <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-destructive" />
            <p className="ml-4 text-destructive">Redirecting to login...</p>
      </div>
    );
  }
  console.log('[AdminLayout] Render: Authorized, rendering children.');
  return <>{children}</>;
}
