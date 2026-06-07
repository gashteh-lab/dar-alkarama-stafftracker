// app/(admin)/shifts/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Clock, Users, X, Check, RefreshCw, AlertCircle } from "lucide-react";

const SHIFT_TYPES = ["FIXED","FLEXIBLE","ROTATING","SPLIT","NIGHT"] as const;

function ShiftForm({
  initial, onSubmit, onCancel, loading, error,
}: {
  initial?: any; onSubmit: (d:any)=>void; onCancel: ()=>void; loading: boolean; error: string|null;
}) {
  const [f, setF] = useState(initial || {
    name:"", startTime:"08:00", endTime:"17:00", gracePeriod:15,
    breakDuration:60, workingHours:8, shiftType:"FIXED",
    crossesMidnight:false, color:"#6366f1", isActive:true,
  });

  return (
    <form onSubmit={e=>{e.preventDefault();onSubmit(f);}} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Shift Name *</label>
          <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} required placeholder="Morning Shift"
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Start Time *</label>
          <input type="time" value={f.startTime} onChange={e=>setF({...f,startTime:e.target.value})} required
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">End Time *</label>
          <input type="time" value={f.endTime} onChange={e=>setF({...f,endTime:e.target.value})} required
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Grace Period (min)</label>
          <input type="number" min={0} max={120} value={f.gracePeriod} onChange={e=>setF({...f,gracePeriod:+e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Break Duration (min)</label>
          <input type="number" min={0} max={480} value={f.breakDuration} onChange={e=>setF({...f,breakDuration:+e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Working Hours</label>
          <input type="number" min={0} max={24} step={0.5} value={f.workingHours} onChange={e=>setF({...f,workingHours:+e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Shift Type</label>
          <select value={f.shiftType} onChange={e=>setF({...f,shiftType:e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            {SHIFT_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={f.color} onChange={e=>setF({...f,color:e.target.value})}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-1" />
            <span className="text-xs text-slate-400 font-mono">{f.color}</span>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <input type="checkbox" id="crossesMidnight" checked={f.crossesMidnight} onChange={e=>setF({...f,crossesMidnight:e.target.checked})}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
          <label htmlFor="crossesMidnight" className="text-sm text-slate-600 dark:text-slate-300">This shift crosses midnight (night shift)</label>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {initial ? "Update Shift" : "Create Shift"}
        </button>
      </div>
    </form>
  );
}

export default function ShiftsPage() {
  const [shifts,   setShifts]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<"create"|"edit"|null>(null);
  const [editing,  setEditing]  = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/shifts");
    const data = await res.json();
    if (data.success) setShifts(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(formData: any) {
    setSaving(true); setError(null);
    const res  = await fetch("/api/shifts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(formData) });
    const data = await res.json();
    if (!data.success) { setError(data.error); setSaving(false); return; }
    setModal(null); load();
    setSaving(false);
  }

  async function handleUpdate(formData: any) {
    setSaving(true); setError(null);
    const res  = await fetch(`/api/shifts/${editing.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(formData) });
    const data = await res.json();
    if (!data.success) { setError(data.error); setSaving(false); return; }
    setModal(null); setEditing(null); load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this shift?")) return;
    const res  = await fetch(`/api/shifts/${id}`, { method:"DELETE" });
    const data = await res.json();
    if (!data.success) alert(data.error);
    else load();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shifts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{shifts.filter(s=>s.isActive).length} active shifts</p>
        </div>
        <button onClick={()=>{setEditing(null);setError(null);setModal("create");}}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" />Create Shift
        </button>
      </div>

      {/* Shifts grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i=><div key={i} className="h-40 skeleton rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map(shift => (
            <div key={shift.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 ${!shift.isActive ? "opacity-50 border-dashed" : ""} border-slate-100 dark:border-slate-800`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${shift.color}20` }}>
                    <Clock className="w-5 h-5" style={{ color: shift.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{shift.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{shift.shiftType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>{setEditing(shift);setError(null);setModal("edit");}}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={()=>handleDelete(shift.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Hours</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{shift.startTime} → {shift.endTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Grace period</span>
                  <span className="text-slate-600 dark:text-slate-300 text-xs">{shift.gracePeriod} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Break</span>
                  <span className="text-slate-600 dark:text-slate-300 text-xs">{shift.breakDuration} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Working hours</span>
                  <span className="text-slate-600 dark:text-slate-300 text-xs">{shift.workingHours}h</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Users className="w-3 h-3" />Staff assigned
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{shift._count?.staff || 0}</span>
                </div>
              </div>
              {shift.crossesMidnight && (
                <div className="mt-3 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  ↻ Crosses midnight
                </div>
              )}
            </div>
          ))}

          {shifts.length === 0 && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm">No shifts created yet</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setModal(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {modal === "create" ? "Create Shift" : "Edit Shift"}
              </h2>
              <button onClick={()=>setModal(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <ShiftForm
                initial={editing}
                onSubmit={modal === "create" ? handleCreate : handleUpdate}
                onCancel={() => setModal(null)}
                loading={saving}
                error={error}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
