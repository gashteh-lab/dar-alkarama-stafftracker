// hooks/useSessionGuard.ts
// 1. On mount: silently refresh the session (rolling 30-day window)
// 2. Every 10 min: ping /api/auth/me to check session is still valid
// 3. If session expires: set expired=true → ReAuthModal shows (NO redirect)
// 4. After re-auth: set expired=false → app continues normally

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CHECK_INTERVAL  = 10 * 60 * 1000; // Check every 10 minutes
const REFRESH_ON_OPEN = true;            // Refresh session every time app opens

export function useSessionGuard() {
  const [sessionExpired, setSessionExpired] = useState(false);
  const [employeeId,     setEmployeeId]     = useState("");
  const [fullName,       setFullName]       = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh session (extend 30 days from now)
  const refreshSession = useCallback(async () => {
    try {
      await fetch("/api/auth/refresh", { method: "POST" });
    } catch {}
  }, []);

  // Check if session is still valid
  const checkSession = useCallback(async () => {
    try {
      const res  = await fetch("/api/auth/me", { cache: "no-store" });

      if (res.status === 401) {
        // Get current user info before showing modal
        setSessionExpired(true);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmployeeId(data.data?.user?.employeeId || "");
          setFullName(data.data?.profile?.fullName  || "");
          setSessionExpired(false);
        }
      }
    } catch {
      // Network error — don't log out, stay in current state
    }
  }, []);

  // Called after successful re-auth
  const handleReAuthSuccess = useCallback(() => {
    setSessionExpired(false);
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    // On mount: get user info + refresh session
    checkSession();
    if (REFRESH_ON_OPEN) refreshSession();

    // Periodic check
    intervalRef.current = setInterval(checkSession, CHECK_INTERVAL);

    // Also check when tab becomes visible again (phone unlocked, app reopened)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkSession();
        refreshSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkSession, refreshSession]);

  return {
    sessionExpired,
    employeeId,
    fullName,
    handleReAuthSuccess,
  };
}
