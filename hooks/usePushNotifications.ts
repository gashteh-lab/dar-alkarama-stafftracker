// hooks/usePushNotifications.ts
"use client";

import { useState, useEffect, useCallback } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface PushState {
  permission:    PermissionState;
  isSubscribed:  boolean;
  isLoading:     boolean;
  error:         string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    permission:   "default",
    isSubscribed: false,
    isLoading:    false,
    error:        null,
  });

  const isSupported = typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!isSupported) {
      setState(s => ({ ...s, permission: "unsupported" }));
      return;
    }
    setState(s => ({ ...s, permission: Notification.permission as PermissionState }));

    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(s => ({ ...s, isSubscribed: !!sub }));
      });
    }).catch(() => {});
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState(s => ({ ...s, permission: permission as PermissionState }));

      if (permission !== "granted") {
        setState(s => ({ ...s, isLoading: false, error: "Notification permission denied." }));
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          ? (urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) as BufferSource)
          : undefined,
      });

      const subJson = sub.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          endpoint: subJson.endpoint,
          p256dh:   subJson.keys?.p256dh,
          auth:     subJson.keys?.auth,
          deviceInfo: {
            browser:    navigator.userAgent.includes("Chrome") ? "Chrome" : "Safari",
            deviceType: /Mobile|Android|iPhone/.test(navigator.userAgent) ? "mobile" : "desktop",
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to register on server");

      setState(s => ({ ...s, isSubscribed: true, isLoading: false }));
      return true;
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: err instanceof Error ? err.message : "Subscription failed" }));
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/subscribe", {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
        setState(s => ({ ...s, isSubscribed: false }));
      }
    } catch (err) {
      console.error("Unsubscribe failed:", err);
    }
  }, []);

  return { ...state, isSupported, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String) return new Uint8Array(0);
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
