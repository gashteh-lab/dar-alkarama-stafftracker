// app/(manager)/reports/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, BarChart3, Users, Clock, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function ManagerReportsPage() {
  const [period,  setPeriod]  = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end:   format(endOfMonth(new Date()),   "yyyy-MM-dd"),
  });
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({
      startDate: new Date(period.start).toISOString(),
      endDate:   new Date(period.end + "T23:59:59").toISOString(),
      limit:     "200",
    });
    const res  = await fetch(`/api/reports/attendance?${p}`);
    const data = await res.json();
    if (data.success) {
      const grouped: Record<string, any> = {};
      for (const r of data.data.records) {
        const id = r.staff?.id || "unknown";
        if (!grouped[id]) grouped[id] = {
          name: r.staff?.fullName || "Unknown",
          employeeId: r.staff?.user?.employeeId || "—",
          present: 0, absent: 0, late: 0, totalWorkedH: 0,
        };
        const g = grouped[id];
        if (["PRESENT","LATE","OVERTIME","EARLY_LEAVE","MANUAL_ADJUSTMENT"].includes(r.status)) g.present++;
        if (r.status === "ABSENT") g.absent++;
        if (r.status === "LATE")   g.late++;
        g.totalWorkedH += (r.totalWorkedMinutes || 0) / 60;
      }
      setSummary(Object.values(grouped));
    }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  async function exportCSV() {
    const p = new URLSearchParams({ format:"csv", startDate: new Date(period.start).toISOString(), endDate: new Date(period.end+"T23:59:59").toISOString() });
    const res  = await fetch(`/api/reports/export?${p}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`team-report-${period.start}.csv`; a.click();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your team&apos;s attendance analytics</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      <div className="flex gap-3">
        <input type="date" value={period.start} onChange={e=>setPeriod(p=>({...p,start:e.target.value}))}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        <input type="date" value={period.end}   onChange={e=>setPeriod(p=>({...p,end:e.target.value}))}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon:Users,    label:"Team Size",     value:summary.length,                       color:"text-blue-500"   },
          { icon:Users,    label:"Present Days",  value:summary.reduce((a,s)=>a+s.present,0), color:"text-emerald-500"},
          { icon:Clock,    label:"Total Hours",   value:summary.reduce((a,s)=>a+s.totalWorkedH,0).toFixed(1)+"h", color:"text-purple-500"},
          { icon:TrendingUp,label:"Late Days",    value:summary.reduce((a,s)=>a+s.late,0),    color:"text-amber-500"  },
        ].map(({ icon:Icon, label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <Icon className={`w-4 h-4 mb-2 ${color}`} />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Team Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 dark:border-slate-800">
              {["Staff","Present","Absent","Late","Total Hrs"].map(h=>(
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? [1,2,3].map(i=>(
                <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                  {[1,2,3,4,5].map(j=><td key={j} className="px-5 py-3"><div className="h-4 skeleton rounded" /></td>)}
                </tr>
              )) : summary.map((s, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3"><p className="font-medium text-slate-900 dark:text-white">{s.name}</p><p className="text-xs text-slate-400">{s.employeeId}</p></td>
                  <td className="px-5 py-3"><span className="text-emerald-600 font-semibold">{s.present}</span></td>
                  <td className="px-5 py-3"><span className={`font-semibold ${s.absent>0?"text-red-500":"text-slate-400"}`}>{s.absent}</span></td>
                  <td className="px-5 py-3"><span className={`font-semibold ${s.late>0?"text-amber-500":"text-slate-400"}`}>{s.late}</span></td>
                  <td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">{s.totalWorkedH.toFixed(1)}h</td>
                </tr>
              ))}
              {!loading && summary.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">No data for selected period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
