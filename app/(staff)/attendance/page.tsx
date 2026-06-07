// app/(staff)/attendance/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, TrendingUp, UserCheck, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

const STATUS_MAP: Record<string, { label: string; dot: string; text: string }> = {
  PRESENT:          { label:"Present",     dot:"bg-emerald-400", text:"text-emerald-600 dark:text-emerald-400" },
  LATE:             { label:"Late",        dot:"bg-amber-400",   text:"text-amber-600 dark:text-amber-400" },
  ABSENT:           { label:"Absent",      dot:"bg-red-400",     text:"text-red-600 dark:text-red-400" },
  HALF_DAY:         { label:"Half Day",    dot:"bg-orange-400",  text:"text-orange-600 dark:text-orange-400" },
  EARLY_LEAVE:      { label:"Early Leave", dot:"bg-orange-400",  text:"text-orange-600 dark:text-orange-400" },
  OVERTIME:         { label:"Overtime",    dot:"bg-purple-400",  text:"text-purple-600 dark:text-purple-400" },
  MISSED_PUNCH_OUT: { label:"Missed Out",  dot:"bg-rose-400",    text:"text-rose-600 dark:text-rose-400" },
  OFFLINE_PUNCH:    { label:"Offline",     dot:"bg-blue-400",    text:"text-blue-600 dark:text-blue-400" },
  MANUAL_ADJUSTMENT:{ label:"Adjusted",   dot:"bg-indigo-400",  text:"text-indigo-600 dark:text-indigo-400" },
  ON_LEAVE:         { label:"On Leave",    dot:"bg-slate-400",   text:"text-slate-500" },
  WEEKEND:          { label:"Weekend",     dot:"bg-slate-200",   text:"text-slate-400" },
};

function formatMins(m: number): string {
  if (!m || m === 0) return "—";
  const h = Math.floor(m / 60); const min = m % 60;
  return h > 0 ? `${h}h ${min.toString().padStart(2,"0")}m` : `${min}m`;
}

export default function AttendanceHistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records,  setRecords]  = useState<any[]>([]);
  const [summary,  setSummary]  = useState<Record<string,number>>({});
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const start = startOfMonth(currentMonth);
    const end   = endOfMonth(currentMonth);
    const p = new URLSearchParams({
      startDate: start.toISOString(),
      endDate:   end.toISOString(),
      limit:     "60",
    });
    const res  = await fetch(`/api/attendance/history?${p}`);
    const data = await res.json();
    if (data.success) {
      setRecords(data.data.records);
      setSummary(data.data.summary || {});
    }
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => { load(); }, [load]);

  const totalWorked = records.reduce((a, r) => a + (r.totalWorkedMinutes || 0), 0);
  const presentDays = (summary["PRESENT"] || 0) + (summary["LATE"] || 0) + (summary["OVERTIME"] || 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 pt-5 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Attendance History</h1>

        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            disabled={addMonths(currentMonth, 1) > new Date()}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Monthly summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3.5 text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{presentDays}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">Present</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3.5 text-center">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{summary["ABSENT"] || 0}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">Absent</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-3.5 text-center">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatMins(totalWorked)}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">Worked</p>
          </div>
        </div>

        {/* Status breakdown */}
        {Object.keys(summary).length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">This Month</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(summary).map(([status, count]) => {
                const cfg = STATUS_MAP[status];
                if (!cfg || count === 0) return null;
                return (
                  <div key={status} className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                    <span className="text-xs text-slate-500 flex-1">{cfg.label}</span>
                    <span className={`text-xs font-bold ${cfg.text}`}>{count as number}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Records list */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Daily Records ({records.length})
          </p>

          {loading ? (
            Array.from({length:6}).map((_,i)=><div key={i} className="h-20 skeleton rounded-2xl mb-2" />)
          ) : records.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400">No records for {format(currentMonth, "MMMM yyyy")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(r => {
                const cfg = STATUS_MAP[r.status] || STATUS_MAP["PRESENT"];
                return (
                  <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3.5 flex items-center gap-3">
                    {/* Date column */}
                    <div className="w-12 text-center shrink-0">
                      <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                        {format(new Date(r.date), "d")}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase">
                        {format(new Date(r.date), "EEE")}
                      </p>
                    </div>

                    {/* Status bar */}
                    <div className={`w-1 h-10 rounded-full ${cfg.dot} shrink-0`} />

                    {/* Times */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                        {r.lateMinutes > 0 && (
                          <span className="text-[10px] text-amber-500 font-medium">+{r.lateMinutes}m late</span>
                        )}
                        {r.source === "OFFLINE" && (
                          <span className="text-[10px] text-blue-400">offline</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 font-mono">
                        {r.punchIn  ? format(new Date(r.punchIn),  "hh:mm a") : "—"}
                        <span className="text-slate-300 dark:text-slate-600 mx-1.5">→</span>
                        {r.punchOut ? format(new Date(r.punchOut), "hh:mm a") : "—"}
                      </p>
                    </div>

                    {/* Worked hours */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatMins(r.totalWorkedMinutes)}
                      </p>
                      {r.overtimeMinutes > 0 && (
                        <p className="text-[10px] text-purple-500 mt-0.5">+{r.overtimeMinutes}m OT</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
