// public/sw-custom.js
// StaffTrack PWA — Custom Service Worker
// Handles: offline caching, background sync for punch events, push notifications

const CACHE_VERSION = "v1.0.0";
const APP_SHELL_CACHE = `stafftrack-shell-${CACHE_VERSION}`;
const DYNAMIC_CACHE   = `stafftrack-dynamic-${CACHE_VERSION}`;
const OFFLINE_QUEUE_SYNC_TAG = "stafftrack-punch-sync";

// App shell files to pre-cache
const APP_SHELL_FILES = [
  "/",
  "/dashboard",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ─────────────────────────────────────────
// INSTALL — pre-cache app shell
// ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing StaffTrack service worker...");
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_FILES).catch((err) => {
        console.warn("[SW] Some shell files failed to cache:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────
// ACTIVATE — clean old caches
// ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating StaffTrack service worker...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────
// FETCH — network-first for API, cache-first for assets
// ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Skip internal Next.js routes
  if (url.pathname.startsWith("/_next/hmr") || url.pathname.startsWith("/__nextjs")) {
    return;
  }

  // API routes — network first, offline fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Static assets — cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // App pages — network first, fall back to cache, then offline page
  event.respondWith(networkFirstWithOfflineFallback(request));
});

// ─────────────────────────────────────────
// BACKGROUND SYNC — offline punch queue
// ─────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === OFFLINE_QUEUE_SYNC_TAG) {
    console.log("[SW] Background sync triggered: processing offline punches");
    event.waitUntil(syncOfflinePunches());
  }
});

// ─────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "StaffTrack", body: event.data.text() };
  }

  const options = {
    body:    data.body || "",
    icon:    "/icons/icon-192x192.png",
    badge:   "/icons/icon-96x96.png",
    vibrate: [100, 50, 100],
    data: {
      url:       data.url || "/dashboard",
      timestamp: Date.now(),
      ...data.data,
    },
    actions: data.actions || [],
    tag:     data.tag || "stafftrack-notification",
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
  };

  // Style notification based on type
  if (data.type === "LATE_WARNING") {
    options.vibrate = [200, 100, 200, 100, 200];
  } else if (data.type === "PUNCH_REMINDER") {
    options.actions = [
      { action: "punch", title: "Punch In Now" },
      { action: "dismiss", title: "Dismiss" },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "StaffTrack", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "punch") {
    event.waitUntil(
      clients.openWindow("/dashboard?action=punch")
    );
    return;
  }

  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ─────────────────────────────────────────
// MESSAGE HANDLER — from app to SW
// ─────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "TRIGGER_SYNC") {
    self.registration.sync.register(OFFLINE_QUEUE_SYNC_TAG).catch((err) => {
      console.error("[SW] Sync registration failed:", err);
    });
  }

  if (event.data?.type === "CACHE_URLS") {
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.addAll(event.data.urls || []);
    });
  }
});

// ─────────────────────────────────────────
// CACHE STRATEGIES
// ─────────────────────────────────────────

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("Resource not available offline", { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    return new Response(
      JSON.stringify({ success: false, error: "You are offline", offline: true }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request, { signal: AbortSignal.timeout(10000) });
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    // Serve offline page for navigation requests
    const offlinePage = await caches.match("/offline");
    if (offlinePage) return offlinePage;

    return new Response(
      "<h1>You are offline</h1><p>Please reconnect to continue using StaffTrack.</p>",
      { status: 503, headers: { "Content-Type": "text/html" } }
    );
  }
}

// ─────────────────────────────────────────
// OFFLINE PUNCH SYNC
// ─────────────────────────────────────────

async function syncOfflinePunches() {
  try {
    // Read queued punches from IndexedDB via message to client
    const allClients = await clients.matchAll({ includeUncontrolled: true });

    if (allClients.length > 0) {
      // Tell the app to process the sync (it has access to IndexedDB)
      allClients.forEach((client) => {
        client.postMessage({ type: "PROCESS_OFFLINE_SYNC" });
      });
    } else {
      // No active client — do sync directly using stored data
      await directSyncOfflinePunches();
    }
  } catch (error) {
    console.error("[SW] Sync error:", error);
    throw error; // Causes retry
  }
}

async function directSyncOfflinePunches() {
  // Open IndexedDB directly from SW context
  const dbName    = "stafftrack-offline";
  const storeName = "punch-queue";

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onsuccess = async (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(storeName)) {
        resolve();
        return;
      }

      const tx    = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const getAllReq = store.index("isSynced").getAll(IDBKeyRange.only(false));

      getAllReq.onsuccess = async () => {
        const pendingRecords = getAllReq.result || [];
        console.log(`[SW] Found ${pendingRecords.length} offline records to sync`);

        for (const record of pendingRecords) {
          try {
            const response = await fetch("/api/attendance/sync", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ records: [record] }),
            });

            if (response.ok) {
              // Mark as synced
              record.isSynced  = true;
              record.syncedAt  = new Date().toISOString();
              store.put(record);
              console.log(`[SW] Synced punch: ${record.id}`);
            }
          } catch (err) {
            console.error(`[SW] Failed to sync punch ${record.id}:`, err);
          }
        }

        resolve();
      };

      getAllReq.onerror = () => reject(getAllReq.error);
    };

    request.onerror = () => reject(request.error);
  });
}
