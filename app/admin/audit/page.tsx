// app/(admin)/audit/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const ACTION_COLORS: Record<string,string> = {
  LOGIN:         "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  LOGOUT:        "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  LOGIN_FAILED:  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PUNCH_IN:      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PUNCH_OUT:     "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  PUNCH_FAILED:  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  GEOFENCE_VIOLATION: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  STAFF_CREATED: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  STAFF_UPDATED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STAFF_DEACTIVATED: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ATTENDANCE_EDITED: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ACCOUNT_LOCKED:"bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SETTINGS_CHANGED: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  OFFLINE_SYNC:  "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

export default function AuditPage() {
  const [logs,       setLogs]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total:0, pages:1 });
  const [search,     setSearch]     = useState("");
  const [action,     setAction]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) p.set("search", search);
    if (action) p.set("action", action);
    const res  = await fetch(`/api/audit?${p}`);
    const data = await res.json();
    if (data.success) {
      setLogs(data.data.logs);
      setPagination(data.data.pagination);
    }
    setLoading(false);
  }, [page, search, action]);

  useEffect(() => { load(); }, [load]);

  const uniqueActions = Object.keys(ACTION_COLORS);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pagination.total} events recorded</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search by user or IP..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <select value={action} onChange={e=>{setAction(e.target.value);setPage(1);}}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">All actions</option>
          {uniqueActions.map(a=><option key={a} value={a}>{a.replace(/_/g," ")}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Reason</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:8}).map((_,i)=>(
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                    {[1,2,3,4,5].map(j=><td key={j} className="px-4 py-4"><div className="h-4 skeleton rounded" /></td>)}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-400">No audit events found</p>
                </td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-500"}`}>
                        {log.action.replace(/_/g," ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {log.user?.profile?.fullName || "System"}
                      </p>
                      <p className="text-xs text-slate-400">{log.user?.employeeId || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <p className="text-xs text-slate-500 max-w-xs truncate">{log.reason || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{format(new Date(log.timestamp), "hh:mm a")}</p>
                      <p className="text-xs text-slate-400">{format(new Date(log.timestamp), "d MMM yyyy")}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs font-mono text-slate-400">{log.ipAddress || "—"}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400">Page {page} of {pagination.pages}</p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-500"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={()=>setPage(p=>Math.min(pagination.pages,p+1))} disabled={page===pagination.pages} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-500"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
