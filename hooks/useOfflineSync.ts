// hooks/useOfflineSync.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { syncOfflinePunches, getOfflinePunchCount } from "@/lib/offline/indexeddb";

interface OfflineSyncState {
  isOnline:      boolean;
  isSyncing:     boolean;
  pendingCount:  number;
  lastSyncAt:    Date | null;
  syncProgress:  number; // 0–100
  syncError:     string | null;
}

export function useOfflineSync(staffId?: string) {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline:     true,
    isSyncing:    false,
    pendingCount: 0,
    lastSyncAt:   null,
    syncProgress: 0,
    syncError:    null,
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshPendingCount = useCallback(async () => {
    if (!staffId) return;
    try {
      const count = await getOfflinePunchCount(staffId);
      setState((s) => ({ ...s, pendingCount: count }));
    } catch {}
  }, [staffId]);

  const runSync = useCallback(async () => {
    if (!navigator.onLine || state.isSyncing) return;

    setState((s) => ({ ...s, isSyncing: true, syncProgress: 0, syncError: null }));

    try {
      const result = await syncOfflinePunches((synced, total) => {
        setState((s) => ({
          ...s,
          syncProgress: Math.round((synced / total) * 100),
        }));
      });

      setState((s) => ({
        ...s,
        isSyncing:    false,
        syncProgress: 100,
        pendingCount: result.failed,
        lastSyncAt:   new Date(),
        syncError:    result.errors.length > 0 ? `${result.failed} records failed to sync` : null,
      }));

      // Notify service worker of success
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SYNC_COMPLETE",
          synced: result.synced,
        });
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        isSyncing:  false,
        syncError:  "Sync failed. Will retry when online.",
      }));
    }
  }, [state.isSyncing]);

  // Online/offline detection
  useEffect(() => {
    const setOnline  = () => {
      setState((s) => ({ ...s, isOnline: true }));
      // Delay sync slightly to ensure stable connection
      syncTimeoutRef.current = setTimeout(runSync, 2000);
    };
    const setOffline = () => setState((s) => ({ ...s, isOnline: false }));

    // Set initial state
    setState((s) => ({ ...s, isOnline: navigator.onLine }));

    window.addEventListener("online",  setOnline);
    window.addEventListener("offline", setOffline);

    return () => {
      window.removeEventListener("online",  setOnline);
      window.removeEventListener("offline", setOffline);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [runSync]);

  // Listen for SW messages
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PROCESS_OFFLINE_SYNC") {
        runSync();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [runSync]);

  // Initial pending count check
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return {
    ...state,
    runSync,
    refreshPendingCount,
  };
}
