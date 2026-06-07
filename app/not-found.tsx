// app/not-found.tsx
import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-7xl font-black text-slate-200 dark:text-slate-800 mb-4">404</p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Home className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
