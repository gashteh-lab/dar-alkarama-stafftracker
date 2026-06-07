// app/(admin)/attendance/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, Download, Edit2, Flag, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, X, Check,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

const STATUS_MAP: Record<string, {label:string;color:string}> = {
  PRESENT:          { label:"Present",       color:"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  ABSENT:           { label:"Absent",        color:"bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  LATE:             { label:"Late",          color:"bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  HALF_DAY:         { label:"Half Day",      color:"bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  EARLY_LEAVE:      { label:"Early Leave",   color:"bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  OVERTIME:         { label:"Overtime",      color:"bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  MISSED_PUNCH_OUT: { label:"Missed Out",    color:"bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  OFFLINE_PUNCH:    { label:"Offline",       color:"bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  MANUAL_ADJUSTMENT:{ label:"Manual",        color:"bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  ON_LEAVE:         { label:"On Leave",      color:"bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  WEEKEND:          { label:"Weekend",       color:"bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

function EditModal({ record, onClose, onSave }: any) {
  const [form,    setForm]    = useState({
    punchIn:    record.punchIn    ? format(new Date(record.punchIn),  "yyyy-MM-dd'T'HH:mm") : "",
    punchOut:   record.punchOut   ? format(new Date(record.punchOut), "yyyy-MM-dd'T'HH:mm") : "",
    status:     record.status,
    editReason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.editReason.trim()) { setError("A reason is required for manual edits."); return; }
    setSaving(true); setError(null);
    const res  = await fetch(`/api/attendance/${record.id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        punchIn:    form.punchIn    ? new Date(form.punchIn).toISOString()  : undefined,
        punchOut:   form.punchOut   ? new Date(form.punchOut).toISOString() : undefined,
        status:     form.status,
        editReason: form.editReason,
      }),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error); setSaving(false); return; }
    onSave(); onClose();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Edit Attendance</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl text-sm text-red-600"><AlertCircle className="w-4 h-4 shrink-0"/>{error}</div>}
          <div>
            <p className="text-xs text-slate-500 mb-3">
              <span className="font-medium text-slate-700 dark:text-slate-300">{record.staff?.fullName}</span> · {format(new Date(record.date), "d MMM yyyy")}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Punch In</label>
            <input type="datetime-local" value={form.punchIn} onChange={e=>setForm({...form,punchIn:e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Punch Out</label>
            <input type="datetime-local" value={form.punchOut} onChange={e=>setForm({...form,punchOut:e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason for Edit *</label>
            <textarea value={form.editReason} onChange={e=>setForm({...form,editReason:e.target.value})} required rows={2}
              placeholder="Explain why this attendance record is being manually edited..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminAttendancePage() {
  const [records,    setRecords]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total:0, pages:1 });
  const [filters,    setFilters]    = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate:   format(endOfMonth(new Date()),   "yyyy-MM-dd"),
    status:    "", staffId: "", search: "",
  });
  const [staff,      setStaff]      = useState<any[]>([]);
  const [editing,    setEditing]    = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({
      page: String(page), limit: "30",
      startDate: new Date(filters.startDate).toISOString(),
      endDate:   new Date(filters.endDate + "T23:59:59").toISOString(),
      ...(filters.status  ? { status:  filters.status  } : {}),
      ...(filters.staffId ? { staffId: filters.staffId } : {}),
    });
    const res  = await fetch(`/api/reports/attendance?${p}`);
    const data = await res.json();
    if (data.success) {
      setRecords(data.data.records);
      setPagination(data.data.pagination);
    }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/options?type=staff").then(r=>r.json()).then(d=>setStaff(d.data||[]));
  }, []);

  function formatMins(m: number) {
    if (!m || m === 0) return "—";
    const h = Math.floor(m/60); const min = m%60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Records</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pagination.total} records</p>
        </div>
        <button onClick={async()=>{
          const p = new URLSearchParams({ format:"csv", startDate:new Date(filters.startDate).toISOString(), endDate:new Date(filters.endDate+"T23:59:59").toISOString() });
          const res  = await fetch(`/api/reports/export?${p}`);
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement("a"); a.href=url; a.download=`attendance-${filters.startDate}.csv`; a.click();
        }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <input type="date" value={filters.startDate} onChange={e=>setFilters({...filters,startDate:e.target.value})}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        <input type="date" value={filters.endDate} onChange={e=>setFilters({...filters,endDate:e.target.value})}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        <select value={filters.status} onChange={e=>{setFilters({...filters,status:e.target.value});setPage(1);}}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">All statuses</option>
          {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filters.staffId} onChange={e=>{setFilters({...filters,staffId:e.target.value});setPage(1);}}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
          <option value="">All staff</option>
          {staff.map((s:any)=><option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Punch In</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Punch Out</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Worked</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Source</th>
                <th className="px-4 py-3.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:8}).map((_,i)=>(
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                    {[1,2,3,4,5,6,7,8].map(j=><td key={j} className="px-4 py-4"><div className="h-4 skeleton rounded" /></td>)}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">No attendance records found for the selected filters.</td></tr>
              ) : (
                records.map((r:any) => {
                  const st = STATUS_MAP[r.status] || { label: r.status, color: "bg-slate-100 text-slate-500" };
                  return (
                    <tr key={r.id} className={`border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${r.isFlagged ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{r.staff?.fullName || "—"}</p>
                          <p className="text-xs text-slate-400">{r.staff?.user?.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {format(new Date(r.date), "EEE, d MMM")}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {r.punchIn ? format(new Date(r.punchIn), "hh:mm a") : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        {r.lateMinutes > 0 && <span className="ml-1.5 text-[10px] text-amber-500">+{r.lateMinutes}m</span>}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {r.punchOut ? format(new Date(r.punchOut), "hh:mm a") : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatMins(r.totalWorkedMinutes)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.color}`}>{st.label}</span>
                          {r.isFlagged && <span title={r.flagReason}><Flag className="w-3 h-3 text-amber-500" /></span>}
                          {r.source === "OFFLINE" && <span className="text-[10px] text-blue-500 font-medium">offline</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-[10px] text-slate-400 uppercase">{r.source}</span>
                        {r.editedBy && <p className="text-[10px] text-indigo-400">edited</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditing(r)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400">Page {page} of {pagination.pages} · {pagination.total} records</p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-500"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={()=>setPage(p=>Math.min(pagination.pages,p+1))} disabled={page===pagination.pages} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-500"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
      </div>

      {editing && <EditModal record={editing} onClose={()=>setEditing(null)} onSave={load} />}
    </div>
  );
}
