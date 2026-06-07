// components/layout/StaffShellFinal.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, User, FileEdit, Plane,
  WifiOff, RefreshCw, X, Download, Smartphone,
} from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { usePWAInstall }  from "@/hooks/usePWAInstall";
import NotificationsBell  from "@/components/ui/NotificationsBell";
import type { SessionUser } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "Home",       icon: LayoutDashboard },
  { href: "/attendance",  label: "Attendance", icon: Calendar },
  { href: "/leave",       label: "Leave",      icon: Plane },
  { href: "/corrections", label: "Requests",   icon: FileEdit },
  { href: "/profile",     label: "Profile",    icon: User },
];

export default function StaffShellFinal({
  session, children,
}: { session: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOnline, pendingCount, isSyncing, runSync } = useOfflineSync(session.id);
  const { canInstall, showIOSInstructions, isStandalone, promptInstall } = usePWAInstall();
  const [showInstall,  setShowInstall]  = useState(false);
  const [showUpdate,   setShowUpdate]   = useState(false);

  useEffect(() => {
    if (!isStandalone && (canInstall || showIOSInstructions)) {
      const dismissed = localStorage.getItem("stafftrack-install-dismissed");
      if (!dismissed) {
        const t = setTimeout(() => setShowInstall(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [canInstall, showIOSInstructions, isStandalone]);

  useEffect(() => {
    const handle = () => setShowUpdate(true);
    window.addEventListener("sw-update-available", handle);
    return () => window.removeEventListener("sw-update-available", handle);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-amber-950 text-sm font-medium z-50 shrink-0">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline — punches will sync when reconnected</span>
        </div>
      )}
      {/* Sync banner */}
      {isOnline && pendingCount > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm z-50 shrink-0">
          <span className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : `${pendingCount} offline punch${pendingCount !== 1 ? "es" : ""} pending`}
          </span>
          {!isSyncing && <button onClick={runSync} className="underline text-xs font-semibold">Sync now</button>}
        </div>
      )}
      {/* Update banner */}
      {showUpdate && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm z-50 shrink-0">
          <span>New version available</span>
          <button onClick={() => { navigator.serviceWorker.controller?.postMessage({ type:"SKIP_WAITING" }); window.location.reload(); }} className="underline font-semibold text-xs">Update</button>
        </div>
      )}
      {/* Install banner */}
      {showInstall && canInstall && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 text-white text-sm z-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-xs">Install StaffTrack</p>
              <p className="text-slate-400 text-xs">Works offline · faster access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => promptInstall()} className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-semibold">Install</button>
            <button onClick={() => { setShowInstall(false); localStorage.setItem("stafftrack-install-dismissed","1"); }} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {showInstall && showIOSInstructions && !canInstall && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 bg-slate-900 text-white text-sm z-50 shrink-0">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs mb-0.5">Add to Home Screen</p>
              <p className="text-slate-400 text-xs">Tap <span className="text-white">Share</span> → <span className="text-white">Add to Home Screen</span></p>
            </div>
          </div>
          <button onClick={() => { setShowInstall(false); localStorage.setItem("stafftrack-install-dismissed","1"); }} className="p-1 text-slate-400 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Top header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {session.fullName.split(" ")[0]}
        </p>
        <NotificationsBell />
      </header>

      {/* Main */}
      <main className="flex-1 pb-20 overflow-auto">{children}</main>

      {/* Bottom nav — 5 items */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 bottom-nav">
        <div className="flex items-center justify-around max-w-lg mx-auto px-1 pt-2 pb-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors touch-target min-w-0
                  ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`}>
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span className={`text-[9px] font-medium truncate ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
