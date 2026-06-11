// components/auth/ReAuthModal.tsx
// When session expires, show this modal INSIDE the app instead of
// redirecting to /login (which breaks iOS standalone mode).
// Staff re-enter their password without ever leaving the app.

"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Fingerprint, AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  employeeId: string;
  fullName:   string;
  onSuccess:  () => void;
}

export default function ReAuthModal({ employeeId, fullName, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true); setError(null);

    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: employeeId, password }),
      });
      const data = await res.json();

      if (data.success) {
        setPassword("");
        onSuccess();
      } else {
        setAttempts(a => a + 1);
        setError(attempts >= 2
          ? "Too many failed attempts. Please contact your administrator."
          : "Incorrect password. Please try again."
        );
      }
    } catch {
      setError("Connection error. Please check your internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>

      <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Fingerprint className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-white font-bold text-lg">Session Expired</h2>
          <p className="text-blue-100 text-sm mt-1">
            Welcome back, {fullName.split(" ")[0]}
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-5">
          <p className="text-xs text-slate-400 text-center mb-4">
            Enter your password to continue
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Employee ID (read-only) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Employee ID
              </label>
              <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-mono text-slate-500 dark:text-slate-400">
                {employeeId}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  required
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password || attempts >= 3}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Signing in...</>
                : "Continue"
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
