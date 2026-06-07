// components/layout/StaffShell.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, User, Bell, FileEdit,
  WifiOff, RefreshCw, X, Download, Smartphone
} from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { usePWAInstall }  from "@/hooks/usePWAInstall";
import type { SessionUser } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance",   label: "Attendance", icon: Calendar },
  { href: "/corrections",  label: "Requests",  icon: FileEdit },
  { href: "/profile",      label: "Profile",   icon: User },
];

export default function StaffShell({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isOnline, pendingCount, isSyncing, runSync } = useOfflineSync(session.id);
  const { canInstall, showIOSInstructions, isStandalone, promptInstall } = usePWAInstall();

  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateBanner,  setShowUpdateBanner]  = useState(false);
  const [showSyncBanner,    setShowSyncBanner]    = useState(false);
  const [notifCount,        setNotifCount]        = useState(0);

  // Show install banner after a short delay if not installed
  useEffect(() => {
    if (!isStandalone && (canInstall || showIOSInstructions)) {
      const dismissed = localStorage.getItem("stafftrack-install-dismissed");
      if (!dismissed) {
        const t = setTimeout(() => setShowInstallBanner(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [canInstall, showIOSInstructions, isStandalone]);

  // Show sync banner when back online with pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      setShowSyncBanner(true);
    } else {
      setShowSyncBanner(false);
    }
  }, [isOnline, pendingCount, isSyncing]);

  // Listen for SW update events
  useEffect(() => {
    const handleUpdate = () => setShowUpdateBanner(true);
    window.addEventListener("sw-update-available", handleUpdate);
    return () => window.removeEventListener("sw-update-available", handleUpdate);
  }, []);

  function dismissInstall() {
    setShowInstallBanner(false);
    localStorage.setItem("stafftrack-install-dismissed", "1");
  }

  function handleInstall() {
    promptInstall().then((accepted) => {
      if (accepted) setShowInstallBanner(false);
    });
  }

  function handleUpdate() {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-amber-950 text-sm font-medium z-50">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You&apos;re offline. Punches will sync when reconnected.</span>
        </div>
      )}

      {/* ── Sync banner ── */}
      {showSyncBanner && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm z-50">
          <span className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing
              ? "Syncing offline punches..."
              : `${pendingCount} offline punch${pendingCount !== 1 ? "es" : ""} pending sync`
            }
          </span>
          {!isSyncing && (
            <button
              onClick={runSync}
              className="underline underline-offset-2 font-semibold text-xs"
            >
              Sync now
            </button>
          )}
        </div>
      )}

      {/* ── SW update banner ── */}
      {showUpdateBanner && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm z-50">
          <span>A new version of StaffTrack is available.</span>
          <button
            onClick={handleUpdate}
            className="underline underline-offset-2 font-semibold text-xs"
          >
            Update now
          </button>
        </div>
      )}

      {/* ── Install banner — Android/Desktop ── */}
      {showInstallBanner && canInstall && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white text-sm z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-xs">Install StaffTrack</p>
              <p className="text-slate-400 text-xs">Works offline, faster access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-semibold"
            >
              Install
            </button>
            <button onClick={dismissInstall} className="p-1 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Install banner — iOS ── */}
      {showInstallBanner && showIOSInstructions && !canInstall && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-slate-900 text-white text-sm z-50">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs mb-0.5">Add to Home Screen</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Tap <span className="text-white">Share</span> → <span className="text-white">Add to Home Screen</span> to install StaffTrack
              </p>
            </div>
          </div>
          <button onClick={dismissInstall} className="p-1 text-slate-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 pb-20 overflow-auto">
        {children}
      </main>

      {/* ── Bottom navigation ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 bottom-nav">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            const badge = label === "Requests" && notifCount > 0 ? notifCount : null;

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors touch-target
                  ${isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-500"
                  }`}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 transition-transform ${isActive ? "scale-110" : ""}`} />
                  {badge && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
