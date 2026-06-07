// components/ui/NotificationsBell.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellOff, Check, CheckCheck, X } from "lucide-react";
import { format } from "date-fns";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const TYPE_ICONS: Record<string, string> = {
  PUNCH_REMINDER:  "⏰",
  LATE_WARNING:    "⚠️",
  ABSENT_ALERT:    "❌",
  MISSED_PUNCH_OUT:"🔔",
  CORRECTION_STATUS:"📋",
  GEOFENCE_EXCEPTION:"📍",
  ANNOUNCEMENT:    "📣",
  OFFLINE_SYNCED:  "🔄",
};

export default function NotificationsBell() {
  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState<any[]>([]);
  const [unread,      setUnread]      = useState(0);
  const [loading,     setLoading]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      if (data.success) {
        setNotifs(data.data.notifications);
        setUnread(data.data.unreadCount);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ markAll: true }) });
    setUnread(0);
    setNotifs(n => n.map(x => ({ ...x, isRead: true })));
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ ids: [id] }) });
    setNotifs(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
    setUnread(c => Math.max(0, c - 1));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
              {unread > 0 && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">{unread}</span>}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600" title="Mark all read">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Push subscription prompt */}
          {isSupported && !isSubscribed && permission !== "denied" && (
            <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/40">
              <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium mb-1.5">Enable push notifications</p>
              <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70 mb-2">Get alerts for punch reminders, late warnings, and more.</p>
              <button onClick={subscribe} className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold">
                Enable Notifications
              </button>
            </div>
          )}

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto">
            {loading && notifs.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-10 text-center">
                <BellOff className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                >
                  <span className="text-base mt-0.5 shrink-0">{TYPE_ICONS[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                      {format(new Date(n.createdAt), "d MMM · hh:mm a")}
                    </p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
