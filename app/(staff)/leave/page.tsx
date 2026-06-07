// app/(staff)/leave/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Calendar, Clock, CheckCircle2, XCircle,
  ChevronRight, X, Check, RefreshCw, AlertCircle,
  Plane, Stethoscope, AlertTriangle, DollarSign,
} from "lucide-react";
import { format, differenceInCalendarDays, addDays } from "date-fns";

const LEAVE_TYPES = [
  { value: "ANNUAL",     label: "Annual Leave",     icon: Plane,         color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-900/30" },
  { value: "SICK",       label: "Sick Leave",       icon: Stethoscope,   color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/30" },
  { value: "EMERGENCY",  label: "Emergency",        icon: AlertTriangle, color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-900/30" },
  { value: "UNPAID",     label: "Unpaid Leave",     icon: DollarSign,    color: "text-slate-500",  bg: "bg-slate-100 dark:bg-slate-800" },
  { value: "MATERNITY",  label: "Maternity",        icon: Calendar,      color: "text-pink-500",   bg: "bg-pink-50 dark:bg-pink-900/30" },
  { value: "PATERNITY",  label: "Paternity",        icon: Calendar,      color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/30" },
  { value: "OTHER",      label: "Other",            icon: Calendar,      color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/30" },
];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Pending",  color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  APPROVED: { label: "Approved", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  REJECTED: { label: "Rejected", color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function ApplyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    leaveType: "ANNUAL",
    startDate: today,
    endDate:   today,
    reason:    "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const days = differenceInCalendarDays(new Date(form.endDate), new Date(form.startDate)) + 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (days < 1) { setError("End date must be on or after start date."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/leave", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType: form.leaveType,
          startDate: new Date(form.startDate + "T00:00:00").toISOString(),
          endDate:   new Date(form.endDate   + "T23:59:59").toISOString(),
          reason:    form.reason,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      onSuccess(); onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  const selectedType = LEAVE_TYPES.find(t => t.value === form.leaveType);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Apply for Leave</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Leave type selector */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Leave Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {LEAVE_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, leaveType: t.value }))}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium text-left transition-all
                      ${form.leaveType === t.value
                        ? `border-blue-500 ${t.bg}`
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}>
                    <Icon className={`w-4 h-4 shrink-0 ${form.leaveType === t.value ? t.color : "text-slate-400"}`} />
                    <span className={form.leaveType === t.value ? "text-slate-900 dark:text-white" : "text-slate-500"}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate} min={today}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">End Date *</label>
              <input type="date" value={form.endDate} min={form.startDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          {/* Duration badge */}
          {days > 0 && (
            <div className={`flex items-center gap-2 p-3 rounded-xl ${selectedType?.bg}`}>
              <Clock className={`w-4 h-4 ${selectedType?.color}`} />
              <p className={`text-sm font-medium ${selectedType?.color}`}>
                {days} day{days !== 1 ? "s" : ""} — {selectedType?.label}
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Reason *</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              required minLength={5} rows={3}
              placeholder="Please provide a reason for your leave request..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeavePage() {
  const [leaves,    setLeaves]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "30" });
    if (statusFilter) p.set("status", statusFilter);
    const res = await fetch(`/api/leave?${p}`);
    const data = await res.json();
    if (data.success) setLeaves(data.data.leaves);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Leave Requests</h1>
            <p className="text-xs text-slate-400 mt-0.5">Apply and track your leave</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" />Apply
          </button>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          {["", "PENDING", "APPROVED", "REJECTED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)
        ) : leaves.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">No leave requests yet</p>
            <p className="text-xs text-slate-400 mt-1">Tap "Apply" to submit a leave request</p>
          </div>
        ) : (
          leaves.map(l => {
            const cfg    = STATUS_CFG[l.status] || STATUS_CFG.PENDING;
            const isOpen = expanded === l.id;
            // Parse leave type from reason
            const match     = l.reason?.match(/^\[(\w+)\]/);
            const leaveType = match ? match[1] : "OTHER";
            const typeInfo  = LEAVE_TYPES.find(t => t.value === leaveType);
            const Icon      = typeInfo?.icon || Calendar;

            return (
              <div key={l.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : l.id)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeInfo?.bg || "bg-slate-100 dark:bg-slate-800"}`}>
                      <Icon className={`w-4.5 h-4.5 ${typeInfo?.color || "text-slate-400"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{typeInfo?.label || "Leave"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {l.correctPunchIn ? format(new Date(l.correctPunchIn), "d MMM") : "—"}
                        {l.correctPunchOut ? ` – ${format(new Date(l.correctPunchOut), "d MMM yyyy")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-2 border-t border-slate-50 dark:border-slate-800 pt-3">
                    <p className="text-xs text-slate-400 mb-1">Reason</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {l.reason?.replace(/^\[\w+\]\s*/, "")}
                    </p>
                    {l.reviewComment && (
                      <div className={`p-3 rounded-xl text-sm ${l.status === "APPROVED" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}>
                        <p className="text-[10px] font-medium mb-0.5 text-slate-400">Admin Comment</p>
                        {l.reviewComment}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-300 dark:text-slate-600">
                      Submitted {format(new Date(l.createdAt), "d MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <ApplyModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
