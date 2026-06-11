// app/(auth)/login/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StandaloneGuard from "@/components/pwa/StandaloneGuard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Fingerprint, AlertCircle, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { loginSchema } from "@/lib/validations";
import type { z } from "zod";

type LoginForm = z.infer<typeof loginSchema>;

// Inner component that uses useSearchParams — must be inside Suspense
function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [isLocked,     setIsLocked]     = useState(false);
  const [isOnline,     setIsOnline]     = useState(true);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  async function onSubmit(data: LoginForm) {
    setIsLoading(true); setError(null); setIsLocked(false);
    try {
      const res    = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) {
        setError(result.error || "Login failed. Please try again.");
        if (result.locked) setIsLocked(true);
        return;
      }
      router.push(result.redirectTo || redirectTo);
      router.refresh();
    } catch {
      setError("Connection error. Please check your internet and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "32px 32px" }} />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {!isOnline && (
        <div className="relative z-10 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">You&apos;re offline. Please connect to the internet to log in.</p>
        </div>
      )}

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-5">
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">StaffTrack</h1>
          <p className="text-slate-400 text-sm mt-1">Attendance management system</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-2xl p-7 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
            <p className="text-slate-400 text-sm mb-6">Use your Employee ID, email, or phone number</p>

            {error && (
              <div className={`flex gap-3 items-start p-3 rounded-xl mb-5 text-sm ${isLocked ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"}`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Employee ID / Email / Phone</label>
                <input {...register("identifier")} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  placeholder="EMP001 or name@company.com" disabled={isLoading || isLocked}
                  className={`w-full px-4 py-3 bg-slate-800/60 border rounded-xl text-white placeholder-slate-500 text-sm transition-all outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${errors.identifier ? "border-red-500/50 focus:ring-red-500/20" : "border-slate-700/60 focus:border-blue-500/50 focus:ring-blue-500/20"}`} />
                {errors.identifier && <p className="text-xs text-red-400 mt-1">{errors.identifier.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input {...register("password")} type={showPassword ? "text" : "password"} autoComplete="current-password"
                    placeholder="Enter your password" disabled={isLoading || isLocked}
                    className={`w-full px-4 py-3 bg-slate-800/60 border rounded-xl text-white placeholder-slate-500 text-sm pr-11 transition-all outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${errors.password ? "border-red-500/50 focus:ring-red-500/20" : "border-slate-700/60 focus:border-blue-500/50 focus:ring-blue-500/20"}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input {...register("rememberMe")} type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500" />
                  <span className="text-xs text-slate-400">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</Link>
              </div>

              <button type="submit" disabled={isLoading || isLocked || !isOnline}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${isLoading || isLocked || !isOnline ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-blue-500/20"}`}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : isLocked ? "Account locked" : !isOnline ? (
                  <span className="flex items-center justify-center gap-2"><WifiOff className="w-4 h-4" />No internet connection</span>
                ) : "Sign in"}
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6">
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-slate-500" />}
            <span className={`text-xs ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>{isOnline ? "Connected" : "Offline"}</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs">Protected by enterprise-grade security</p>
          <p className="text-slate-700 text-xs mt-1">StaffTrack PWA v1.0 — Powered by Next.js</p>
        </div>
      </div>
    </div>
  );
}

// Outer page wraps with Suspense — required by Next.js 14 for useSearchParams
export default function LoginPage() {
  return (
    <StandaloneGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <LoginContent />
      </Suspense>
    </StandaloneGuard>
  );
}
