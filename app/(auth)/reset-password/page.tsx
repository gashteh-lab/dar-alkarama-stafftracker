// app/(auth)/reset-password/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Fingerprint, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") || "";
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [show,       setShow]       = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError(null);
    const res  = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword: confirm }),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
            <Fingerprint className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">New Password</h1>
        </div>
        <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-6 shadow-2xl">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Password updated!</p>
              <p className="text-slate-400 text-sm mt-1">Redirecting to login...</p>
            </div>
          ) : (
            <>
              {!token && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-sm text-red-400">
                  Invalid or expired reset link.
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      required minLength={8}
                      className="w-full px-4 py-3 pr-10 bg-slate-800/60 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:border-blue-500/50 focus:ring-blue-500/20" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password</label>
                  <input type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:border-blue-500/50 focus:ring-blue-500/20" />
                </div>
                <button type="submit" disabled={loading || !token}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-60">
                  {loading ? "Updating..." : "Set New Password"}
                </button>
              </form>
              <Link href="/login" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-300">
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
