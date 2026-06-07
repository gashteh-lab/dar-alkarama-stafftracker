// app/(staff)/corrections/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Clock, CheckCircle2, XCircle, AlertCircle, X, Check, RefreshCw, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const REQUEST_TYPES = [
  { value: "FORGOT_PUNCH_IN",  label: "Forgot to punch in" },
  { value: "FORGOT_PUNCH_OUT", label: "Forgot to punch out" },
  { value: "WRONG_LOCATION",   label: "Wrong location recorded" },
  { value: "TECHNICAL_ISSUE",  label: "Technical issue" },
  { value: "SHIFT_ISSUE",      label: "Shift issue" },
  { value: "APPROVED_LEAVE",   label: "Approved leave" },
  { value: "OTHER",            label: "Other reason" },
];

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:  { label: "Pending",  color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",    icon: Clock },
  APPROVED: { label: "Approved", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",            icon: XCircle },
};

function SubmitModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    requestType: "FORGOT_PUNCH_IN",
    correctPunchIn: "", correctPunchOut: "", reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:            new Date(form.date).toISOString(),
          requestType:     form.requestType,
          correctPunchIn:  form.correctPunchIn  ? new Date(`${form.date}T${form.correctPunchIn}`).toISOString()  : undefined,
          correctPunchOut: form.correctPunchOut ? new Date(`${form.date}T${form.correctPunchOut}`).toISOString() : undefined,
          reason:          form.reason,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      onSuccess(); onClose();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">New Correction Request</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Date *</label>
            <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required
              max={format(new Date(),"yyyy-MM-dd")}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Request Type *</label>
            <select value={form.requestType} onChange={e=>setForm({...form,requestType:e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              {REQUEST_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Correct Punch In</label>
              <input type="time" value={form.correctPunchIn} onChange={e=>setForm({...form,correctPunchIn:e.target.value})}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Correct Punch Out</label>
              <input type="time" value={form.correctPunchOut} onChange={e=>setForm({...form,correctPunchOut:e.target.value})}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason *</label>
            <textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} required rows={3}
              placeholder="Please explain in detail why this correction is needed..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CorrectionsPage() {
  const [requests,   setRequests]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p   = new URLSearchParams({ limit: "30" });
    if (statusFilter) p.set("status", statusFilter);
    const res = await fetch(`/api/corrections?${p}`);
    const data = await res.json();
    if (data.success) setRequests(data.data.requests);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Correction Requests</h1>
            <p className="text-xs text-slate-400 mt-0.5">Submit and track your attendance corrections</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" />New
          </button>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          {["","PENDING","APPROVED","REJECTED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading ? (
          Array.from({length:4}).map((_,i)=><div key={i} className="h-24 skeleton rounded-2xl" />)
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">No correction requests yet</p>
            <p className="text-xs text-slate-400 mt-1">Tap "New" to submit one</p>
          </div>
        ) : (
          requests.map(r => {
            const cfg = STATUS_CFG[r.status];
            const Icon = cfg.icon;
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {REQUEST_TYPES.find(t => t.value === r.requestType)?.label || r.requestType}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(r.date), "EEE, d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-50 dark:border-slate-800 pt-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Reason</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{r.reason}</p>
                    </div>
                    {(r.correctPunchIn || r.correctPunchOut) && (
                      <div className="grid grid-cols-2 gap-3">
                        {r.correctPunchIn && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <p className="text-[10px] text-slate-400 mb-1">Correct Punch In</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {format(new Date(r.correctPunchIn), "hh:mm a")}
                            </p>
                          </div>
                        )}
                        {r.correctPunchOut && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <p className="text-[10px] text-slate-400 mb-1">Correct Punch Out</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {format(new Date(r.correctPunchOut), "hh:mm a")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {r.reviewComment && (
                      <div className={`p-3 rounded-xl ${r.status === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                        <p className="text-[10px] text-slate-400 mb-1">Admin Comment</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{r.reviewComment}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-300 dark:text-slate-600">
                      Submitted {format(new Date(r.createdAt), "d MMM yyyy, hh:mm a")}
                      {r.reviewedAt && ` · Reviewed ${format(new Date(r.reviewedAt), "d MMM, hh:mm a")}`}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && <SubmitModal onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  );
}
