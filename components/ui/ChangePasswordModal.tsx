// components/ui/ChangePasswordModal.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff, X, Check, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, new: false });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { setError("New passwords do not match."); return; }
    if (form.newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    setLoading(true); setError(null);

    const res  = await fetch("/api/auth/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword, confirmPassword: form.confirmPassword }),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error); setLoading(false); return; }
    setSuccess(true);
    setTimeout(onClose, 2000);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Change Password</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-900 dark:text-white">Password updated!</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              {[
                { key: "currentPassword", label: "Current Password", showKey: "current" },
                { key: "newPassword",     label: "New Password",     showKey: "new" },
                { key: "confirmPassword", label: "Confirm New Password", showKey: "new" },
              ].map(({ key, label, showKey }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
                  <div className="relative">
                    <input
                      type={(show as any)[showKey] ? "text" : "password"}
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      required
                      className="w-full px-3 py-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    {(key !== "confirmPassword") && (
                      <button type="button" onClick={() => setShow(s => ({ ...s, [showKey]: !(s as any)[showKey] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {(show as any)[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Update
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
