// app/(admin)/loading.tsx
export default function AdminLoading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 skeleton rounded-lg" />
          <div className="h-4 w-24 skeleton rounded-lg" />
        </div>
        <div className="h-9 w-28 skeleton rounded-xl" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <div className="h-10 w-10 skeleton rounded-xl mb-4" />
            <div className="h-8 w-16 skeleton rounded-lg mb-2" />
            <div className="h-4 w-24 skeleton rounded-lg" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-5 w-32 skeleton rounded-lg" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-50 dark:border-slate-800 last:border-0">
            <div className="h-10 w-10 skeleton rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 skeleton rounded-lg" />
              <div className="h-3 w-24 skeleton rounded-lg" />
            </div>
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
