// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import ThemeScript from "@/components/ui/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title:       { default: "StaffTrack", template: "%s — StaffTrack" },
  description: "Professional staff attendance tracking. Punch in, punch out, manage your team anywhere.",
  keywords:    ["attendance", "staff tracking", "punch in", "HR", "workforce"],
  manifest:    "/manifest.json",
  appleWebApp: { capable: true, title: "StaffTrack", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon:  [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1,
  userScalable: false, viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0F172A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <ThemeScript />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0F172A" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className={GeistSans.className}>
        <div id="app-root">{children}</div>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                reg.addEventListener('updatefound', function() {
                  var nw = reg.installing;
                  if (nw) nw.addEventListener('statechange', function() {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                      window.dispatchEvent(new CustomEvent('sw-update-available'));
                    }
                  });
                });
              }).catch(console.error);
            });
          }
          var deferredPrompt;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault(); deferredPrompt = e;
            window.dispatchEvent(new CustomEvent('pwa-install-available', { detail: e }));
          });
          window.__triggerPWAInstall = function() {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then(function(r) {
                deferredPrompt = null;
                window.dispatchEvent(new CustomEvent('pwa-install-result', { detail: r }));
              });
            }
          };
        `}} />
      </body>
    </html>
  );
}
