// components/pwa/StandaloneGuard.tsx
// Permanent fix: if staff open the app in browser instead of from home screen,
// show a full-screen blocking overlay with clear instructions.
// This prevents confusion and forces the correct app experience.

"use client";

import { useState, useEffect } from "react";
import { Smartphone, ArrowUpFromLine, Share2, MoreVertical, Chrome, Plus } from "lucide-react";

function detectPlatform() {
  const ua = navigator.userAgent;
  const isIOS     = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSamsung = /SamsungBrowser/.test(ua);
  const isChrome  = /Chrome/.test(ua) && !isSamsung;
  return { isIOS, isAndroid, isSamsung, isChrome };
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return true; // SSR — don't block
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as any).standalone === true
  );
}

// How many times user has dismissed — after 2 dismissals, still block
const STORAGE_KEY = "stafftrack-standalone-confirmed";

export default function StandaloneGuard({ children }: { children: React.ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [platform,    setPlatform]    = useState<ReturnType<typeof detectPlatform> | null>(null);
  const [step,        setStep]        = useState<"guide" | "checking">("guide");

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const p = detectPlatform();
    setPlatform(p);

    // If already standalone — never show overlay
    if (isStandaloneMode()) return;

    // Desktop browsers — don't enforce (admins use desktop)
    if (!p.isIOS && !p.isAndroid) return;

    // Mobile but not standalone — show overlay
    setShowOverlay(true);
  }, []);

  // When user taps "I've opened it" — check if now standalone
  function handleCheck() {
    setStep("checking");
    setTimeout(() => {
      if (isStandaloneMode()) {
        setShowOverlay(false);
      } else {
        setStep("guide");
      }
    }, 500);
  }

  if (!showOverlay) return <>{children}</>;

  const isIOS     = platform?.isIOS     ?? false;
  const isAndroid = platform?.isAndroid ?? false;

  return (
    <>
      {/* Still render children underneath so app loads */}
      <div className="invisible pointer-events-none">{children}</div>

      {/* Full-screen blocking overlay */}
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center px-6 text-center">

        {/* Animated phone icon */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
            <span className="text-[10px] font-black text-amber-900">!</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Open in App Mode
        </h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
          StaffTrack must be used as an installed app — not in the browser. Follow the steps below.
        </p>

        {/* iOS Instructions */}
        {isIOS && (
          <div className="w-full max-w-xs space-y-3 mb-8">
            {[
              {
                icon: <Share2 className="w-5 h-5 text-blue-400 shrink-0" />,
                step: "1",
                text: (
                  <>Tap the <strong className="text-white">Share</strong> button at the bottom of Safari</>
                ),
              },
              {
                icon: <Plus className="w-5 h-5 text-blue-400 shrink-0" />,
                step: "2",
                text: (
                  <>Tap <strong className="text-white">"Add to Home Screen"</strong></>
                ),
              },
              {
                icon: <Smartphone className="w-5 h-5 text-blue-400 shrink-0" />,
                step: "3",
                text: (
                  <>Open <strong className="text-white">StaffTrack</strong> from your home screen</>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-900 rounded-2xl px-4 py-3 text-left border border-slate-800">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                  {item.step}
                </div>
                {item.icon}
                <p className="text-sm text-slate-300 flex-1">{item.text}</p>
              </div>
            ))}

            {/* Visual hint for Share button */}
            <div className="flex items-center justify-center gap-2 mt-2 p-3 bg-blue-900/20 rounded-2xl border border-blue-800/40">
              <ArrowUpFromLine className="w-5 h-5 text-blue-400" />
              <p className="text-xs text-blue-300">
                The Share button looks like a box with an arrow pointing up
              </p>
            </div>
          </div>
        )}

        {/* Android Instructions */}
        {isAndroid && (
          <div className="w-full max-w-xs space-y-3 mb-8">
            {[
              {
                icon: <MoreVertical className="w-5 h-5 text-blue-400 shrink-0" />,
                step: "1",
                text: (
                  <>Tap the <strong className="text-white">⋮ menu</strong> (top right of Chrome)</>
                ),
              },
              {
                icon: <Plus className="w-5 h-5 text-blue-400 shrink-0" />,
                step: "2",
                text: (
                  <>Tap <strong className="text-white">"Add to Home Screen"</strong> or <strong className="text-white">"Install App"</strong></>
                ),
              },
              {
                icon: <Smartphone className="w-5 h-5 text-blue-400 shrink-0" />,
                step: "3",
                text: (
                  <>Open <strong className="text-white">StaffTrack</strong> from your home screen</>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-900 rounded-2xl px-4 py-3 text-left border border-slate-800">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                  {item.step}
                </div>
                {item.icon}
                <p className="text-sm text-slate-300 flex-1">{item.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Already installed? Check button */}
        <button
          onClick={handleCheck}
          className="w-full max-w-xs py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-base transition-colors"
        >
          {step === "checking" ? "Checking..." : "I've opened it from home screen ✓"}
        </button>

        <p className="text-slate-600 text-xs mt-4">
          Already installed? Close this page and open the app icon from your home screen.
        </p>
      </div>
    </>
  );
}
