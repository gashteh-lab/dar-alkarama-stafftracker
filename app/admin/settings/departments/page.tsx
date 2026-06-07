// app/(admin)/settings/departments/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Building2, RefreshCw, X, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DepartmentsPage() {
  const [depts,   setDepts]   = useState<any[]>([]);
  const [branches,setBranches]= useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ name:"", branchId:"", id:"" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, b] = await Promise.all([
      fetch("/api/admin/departments").then(r=>r.json()),
      fetch("/api/admin/options?type=branches").then(r=>r.json()),
    ]);
    if (d.success) setDepts(d.data);
    if (b.success) setBranches(b.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const isEdit = !!form.id;
    const res  = await fetch("/api/admin/departments", {
      method: isEdit ? "PUT" : "POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error); setSaving(false); return; }
    setModal(false); setForm({name:"",branchId:"",id:""}); load(); setSaving(false);
  }

  async function toggleActive(dept: any) {
    await fetch("/api/admin/departments", {
      method: "PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id: dept.id, isActive: !dept.isActive }),
    });
    load();
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/settings" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Departments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage company departments</p>
        </div>
        <button onClick={()=>{setForm({name:"",branchId:"",id:""});setModal(true);setError(null);}}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" />Add
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="h-14 skeleton rounded-xl" />)}</div>
        ) : depts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No departments yet</div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {depts.map(d => (
              <div key={d.id} className={`flex items-center justify-between px-5 py-4 ${!d.isActive ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Building2 className="w-4.5 h-4.5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.branch?.name || "No branch"} · {d._count?.staff || 0} staff</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>{setForm({id:d.id,name:d.name,branchId:d.branchId||""});setModal(true);setError(null);}}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={()=>toggleActive(d)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${d.isActive ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"}`}>
                    {d.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{form.id ? "Edit" : "Add"} Department</h2>
              <button onClick={()=>setModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Name *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Branch</label>
                <select value={form.branchId} onChange={e=>setForm({...form,branchId:e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">No branch</option>
                  {branches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={()=>setModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
