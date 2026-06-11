// components/pwa/InstallAppBanner.tsx
// Shows on dashboard when app is not in standalone mode.
// Android: triggers native install prompt
// iOS: shows share → add to home screen instructions

"use client";

import { useState, useEffect } from "react";
import { Download, X, Share2, Plus, Smartphone } from "lucide-react";

export default function InstallAppBanner() {
  const [show,        setShow]        = useState(false);
  const [dismissed,   setDismissed]   = useState(false);
  const [platform,    setPlatform]    = useState<"ios"|"android"|null>(null);
  const [showSteps,   setShowSteps]   = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already standalone — never show
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check if dismissed this session
    if (sessionStorage.getItem("install-banner-dismissed")) return;

    const ua = navigator.userAgent;
    const isIOS     = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);

    if (isIOS)     { setPlatform("ios");     setShow(true); }
    if (isAndroid) { setPlatform("android"); setShow(true); }
  }, []);

  function dismiss() {
    sessionStorage.setItem("install-banner-dismissed", "1");
    setShow(false);
    setDismissed(true);
  }

  function handleInstall() {
    if (platform === "android" && typeof window.__triggerPWAInstall === "function") {
      window.__triggerPWAInstall();
      dismiss();
    } else {
      setShowSteps(true);
    }
  }

  if (!show || dismissed) return null;

  return (
    <>
      {/* Compact banner */}
      {!showSteps && (
        <div className="mx-4 mb-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center gap-3 shadow-lg shadow-blue-500/20">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Install StaffTrack</p>
            <p className="text-blue-100 text-xs">Add to home screen for best experience</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-xl bg-white text-blue-600 font-semibold text-xs"
            >
              Install
            </button>
            <button onClick={dismiss} className="p-1 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS step-by-step modal */}
      {showSteps && platform === "ios" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 bg-black/50">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add to Home Screen</h3>
              <button onClick={dismiss} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { icon: <Share2 className="w-4 h-4 text-blue-500" />, text: <>Tap the <strong>Share</strong> button at the bottom of Safari</> },
                { icon: <Plus className="w-4 h-4 text-blue-500" />,   text: <>Tap <strong>"Add to Home Screen"</strong></> },
                { icon: <Smartphone className="w-4 h-4 text-blue-500" />, text: <>Open <strong>StaffTrack</strong> from your home screen</> },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">{i+1}</div>
                  {s.icon}
                  <p className="text-sm text-slate-700 dark:text-slate-300">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-600 dark:text-blue-400">The Share button is the box with an arrow pointing up at the bottom of Safari</p>
            </div>
            <button onClick={dismiss} className="mt-4 w-full py-3 rounded-2xl bg-blue-600 text-white font-semibold text-sm">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

declare global {
  interface Window { __triggerPWAInstall?: () => void; }
}
