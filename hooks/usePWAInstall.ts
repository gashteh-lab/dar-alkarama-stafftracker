// hooks/usePWAInstall.ts
"use client";

import { useState, useEffect } from "react";

type Platform = "android" | "ios" | "desktop" | "unknown";

interface PWAInstallState {
  canInstall:       boolean;
  isInstalled:      boolean;
  platform:         Platform;
  showIOSInstructions: boolean;
  isStandalone:     boolean;
}

export function usePWAInstall() {
  const [state, setState] = useState<PWAInstallState>({
    canInstall:          false,
    isInstalled:         false,
    platform:            "unknown",
    showIOSInstructions: false,
    isStandalone:        false,
  });

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    const platform: Platform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

    setState((s) => ({
      ...s,
      isStandalone,
      isInstalled: isStandalone,
      platform,
    }));

    // Android/Desktop: listen for beforeinstallprompt
    const handleInstallAvailable = () => {
      setState((s) => ({ ...s, canInstall: true }));
    };

    window.addEventListener("pwa-install-available", handleInstallAvailable);

    // iOS: can't detect installability, so show instructions after delay
    if (isIOS && !isStandalone) {
      setState((s) => ({ ...s, showIOSInstructions: true }));
    }

    return () => {
      window.removeEventListener("pwa-install-available", handleInstallAvailable);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (typeof window.__triggerPWAInstall === "function") {
      window.__triggerPWAInstall();

      return new Promise((resolve) => {
        const handler = (event: Event) => {
          const outcome = (event as CustomEvent).detail?.outcome;
          window.removeEventListener("pwa-install-result", handler);
          resolve(outcome === "accepted");
        };
        window.addEventListener("pwa-install-result", handler);
      });
    }
    return false;
  };

  return {
    ...state,
    promptInstall,
  };
}

// Extend Window type for TypeScript
declare global {
  interface Window {
    __triggerPWAInstall?: () => void;
  }
}
