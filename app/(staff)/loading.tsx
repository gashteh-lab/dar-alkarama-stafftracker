// app/(staff)/loading.tsx
export default function StaffLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-pulse">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 pt-4 pb-5">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-2">
            <div className="h-3 w-28 skeleton rounded" />
            <div className="h-8 w-24 skeleton rounded-lg" />
          </div>
          <div className="h-7 w-16 skeleton rounded-full" />
        </div>
        <div className="h-4 w-48 skeleton rounded" />
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Status card */}
        <div className="h-16 skeleton rounded-2xl" />

        {/* Punch button */}
        <div className="flex justify-center py-4">
          <div className="w-36 h-36 skeleton rounded-full" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>

        {/* Recent records */}
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}
