// components/ui/MonthlyStatsBar.tsx
"use client";

import { useEffect, useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";

interface Stats {
  present: number;
  absent:  number;
  late:    number;
  total:   number;
}

export default function MonthlyStatsBar() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = startOfMonth(new Date()).toISOString();
    const end   = endOfMonth(new Date()).toISOString();

    fetch(`/api/attendance/history?startDate=${start}&endDate=${end}&limit=60`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const s = data.data.summary as Record<string, number>;
          setStats({
            present: (s.PRESENT || 0) + (s.LATE || 0) + (s.OVERTIME || 0) + (s.EARLY_LEAVE || 0) + (s.MANUAL_ADJUSTMENT || 0),
            absent:  s.ABSENT  || 0,
            late:    s.LATE    || 0,
            total:   Object.values(s).reduce((a, v) => a + (typeof v === "number" ? v : 0), 0),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}
      </div>
    );
  }

  if (!stats) return null;

  const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          rate >= 90 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
          rate >= 70 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                       "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        }`}>{rate}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${rate >= 90 ? "bg-emerald-400" : rate >= 70 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${rate}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.present}</p>
          <p className="text-[10px] text-slate-400 font-medium">Present</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${stats.absent > 0 ? "text-red-500" : "text-slate-400"}`}>{stats.absent}</p>
          <p className="text-[10px] text-slate-400 font-medium">Absent</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${stats.late > 0 ? "text-amber-500" : "text-slate-400"}`}>{stats.late}</p>
          <p className="text-[10px] text-slate-400 font-medium">Late</p>
        </div>
      </div>
    </div>
  );
}
