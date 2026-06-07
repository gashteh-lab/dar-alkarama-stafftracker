// app/(admin)/notifications/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Send, Users, RefreshCw, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminNotificationsPage() {
  const [form, setForm] = useState({ title: "", body: "", target: "all" });
  const [sending, setSending]   = useState(false);
  const [sent,    setSent]      = useState(false);
  const [error,   setError]     = useState<string|null>(null);
  const [logs,    setLogs]      = useState<any[]>([]);
  const [staff,   setStaff]     = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/options?type=staff").then(r=>r.json()).then(d=>setStaff(d.data||[]));
    loadLogs();
  }, []);

  async function loadLogs() {
    const res  = await fetch("/api/notifications?limit=20");
    const data = await res.json();
    // Admin sees system-level notifications
  }

  async function sendAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setError(null); setSent(false);
    try {
      const res  = await fetch("/api/notifications/broadcast", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      setSent(true);
      setForm({ title: "", body: "", target: "all" });
      setTimeout(() => setSent(false), 3000);
    } catch { setError("Network error"); }
    finally { setSending(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">Send push notifications and announcements to staff</p>
      </div>

      {/* Send form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Send Announcement</h2>
        </div>

        {sent && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Notification sent successfully!</p>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={sendAnnouncement} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Recipients</label>
            <select value={form.target} onChange={e=>setForm({...form,target:e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              <option value="all">All active staff</option>
              <option value="admins">Admins only</option>
              {staff.map((s:any)=><option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Title *</label>
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required
              placeholder="Important announcement..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Message *</label>
            <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} required rows={3}
              placeholder="Enter your message..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <button type="submit" disabled={sending}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors">
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send Notification"}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Automatic notifications</p>
        <ul className="text-xs text-blue-600 dark:text-blue-400/80 space-y-1">
          <li>• Missed punch-out alerts — sent daily at 10 PM</li>
          <li>• Late arrival warnings — sent when staff punch in late</li>
          <li>• Correction request status — sent when approved/rejected</li>
          <li>• Offline sync confirmation — sent when offline punches sync</li>
        </ul>
      </div>
    </div>
  );
}
