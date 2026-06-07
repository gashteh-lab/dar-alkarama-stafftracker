// app/(admin)/settings/holidays/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ArrowLeft, Calendar, RefreshCw,
  X, Check, AlertCircle, Star,
} from "lucide-react";
import Link from "next/link";
import { format, getYear } from "date-fns";

const UAE_HOLIDAYS_2025 = [
  { name: "New Year's Day",           date: "2025-01-01" },
  { name: "Eid Al Fitr",              date: "2025-03-30" },
  { name: "Eid Al Fitr Holiday",      date: "2025-03-31" },
  { name: "Eid Al Fitr Holiday",      date: "2025-04-01" },
  { name: "Arafat Day (Hajj)",        date: "2025-06-05" },
  { name: "Eid Al Adha",              date: "2025-06-06" },
  { name: "Eid Al Adha Holiday",      date: "2025-06-07" },
  { name: "Eid Al Adha Holiday",      date: "2025-06-08" },
  { name: "Islamic New Year",         date: "2025-06-26" },
  { name: "Prophet's Birthday",       date: "2025-09-04" },
  { name: "UAE Commemoration Day",    date: "2025-11-30" },
  { name: "UAE National Day",         date: "2025-12-02" },
  { name: "UAE National Day Holiday", date: "2025-12-03" },
];

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [year,     setYear]     = useState(getYear(new Date()));
  const [form,     setForm]     = useState({ name: "", date: "", isRecurring: false });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/holidays?year=${year}`);
    const data = await res.json();
    if (data.success) setHolidays(data.data);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  async function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res  = await fetch("/api/admin/holidays", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...form, date: new Date(form.date).toISOString() }),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error); setSaving(false); return; }
    setModal(false); setForm({ name: "", date: "", isRecurring: false }); load(); setSaving(false);
  }

  async function deleteHoliday(id: string) {
    if (!confirm("Remove this holiday?")) return;
    await fetch("/api/admin/holidays", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ id }),
    });
    load();
  }

  async function importUAEHolidays() {
    if (!confirm(`Import ${UAE_HOLIDAYS_2025.length} UAE public holidays for 2025?`)) return;
    let imported = 0;
    for (const h of UAE_HOLIDAYS_2025) {
      try {
        await fetch("/api/admin/holidays", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: h.name, date: new Date(h.date).toISOString(), isRecurring: false }),
        });
        imported++;
      } catch {}
    }
    alert(`Imported ${imported} holidays.`);
    load();
  }

  const monthGroups: Record<string, any[]> = {};
  for (const h of holidays) {
    const month = format(new Date(h.date), "MMMM yyyy");
    if (!monthGroups[month]) monthGroups[month] = [];
    monthGroups[month].push(h);
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/settings" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Holiday Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage public holidays and company days off</p>
        </div>
        <button onClick={importUAEHolidays}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
          <Star className="w-4 h-4 text-amber-500" />UAE Holidays
        </button>
        <button onClick={() => { setForm({ name: "", date: "", isRecurring: false }); setError(null); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" />Add
        </button>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-2">
        <button onClick={() => setYear(y => y - 1)}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
          ←
        </button>
        <span className="text-base font-semibold text-slate-900 dark:text-white px-4">{year}</span>
        <button onClick={() => setYear(y => y + 1)}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
          →
        </button>
        <span className="text-xs text-slate-400 ml-2">{holidays.length} holidays</span>
      </div>

      {/* Holiday list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}</div>
      ) : holidays.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-12 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400">No holidays for {year}</p>
          <button onClick={importUAEHolidays}
            className="mt-3 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            Import UAE public holidays
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(monthGroups).map(([month, items]) => (
            <div key={month} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{month}</p>
              </div>
              {items.map(h => (
                <div key={h.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-10 text-center shrink-0">
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">{format(new Date(h.date), "d")}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{format(new Date(h.date), "EEE")}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{h.name}</p>
                    {h.isRecurring && <p className="text-[10px] text-indigo-400 mt-0.5">↻ Recurring annually</p>}
                  </div>
                  <button onClick={() => deleteHoliday(h.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add Holiday</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={addHoliday} className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Holiday Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="National Day"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="recurring" checked={form.isRecurring}
                  onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                <label htmlFor="recurring" className="text-sm text-slate-600 dark:text-slate-300">Recurring annually</label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
