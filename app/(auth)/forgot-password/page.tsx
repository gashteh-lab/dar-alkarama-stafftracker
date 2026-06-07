// app/(auth)/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { Fingerprint, ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      setSent(true);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
            <Fingerprint className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your Employee ID or email</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-white font-semibold mb-2">Check your email</p>
              <p className="text-slate-400 text-sm">If an account exists, a reset link has been sent. Check your inbox and spam folder.</p>
              <Link href="/login" className="mt-5 flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                <ArrowLeft className="w-4 h-4" />Back to login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Employee ID or Email</label>
                  <input value={identifier} onChange={e=>setIdentifier(e.target.value)} required
                    placeholder="EMP001 or name@company.com"
                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:border-blue-500/50 focus:ring-blue-500/20" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-60 hover:from-blue-500 hover:to-indigo-500">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              <Link href="/login" className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200">
                <ArrowLeft className="w-4 h-4" />Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
