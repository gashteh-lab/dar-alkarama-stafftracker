// app/(admin)/corrections/leave/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Calendar, CheckCircle2, XCircle, RefreshCw, X, Check } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminLeavePage() {
  const [leaves,    setLeaves]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [reviewing, setReviewing] = useState<any>(null);
  const [comment,   setComment]   = useState("");
  const [action,    setAction]    = useState<"APPROVED"|"REJECTED">("APPROVED");
  const [saving,    setSaving]    = useState(false);
  const [status,    setStatus]    = useState("PENDING");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "50" });
    if (status) p.set("status", status);
    // Get APPROVED_LEAVE type corrections
    const res  = await fetch(`/api/corrections?${p}`);
    const data = await res.json();
    if (data.success) {
      setLeaves(data.data.requests.filter((r: any) => r.requestType === "APPROVED_LEAVE"));
    }
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function review() {
    setSaving(true);
    const res  = await fetch(`/api/corrections/${reviewing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ status: action, comment }),
    });
    const data = await res.json();
    if (data.success) { setReviewing(null); setComment(""); load(); }
    setSaving(false);
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/corrections" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review and approve staff leave applications</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {["PENDING","APPROVED","REJECTED",""].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              status === s ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
        ) : leaves.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">No {status.toLowerCase()} leave requests</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {leaves.map(l => (
              <div key={l.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  l.status === "APPROVED" ? "bg-emerald-400" :
                  l.status === "REJECTED" ? "bg-red-400" : "bg-amber-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{l.staff?.fullName}</p>
                    <span className="text-xs text-slate-400">{l.staff?.user?.employeeId}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{l.reason}</p>
                  {l.correctPunchIn && l.correctPunchOut && (
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                      {format(new Date(l.correctPunchIn), "d MMM")} – {format(new Date(l.correctPunchOut), "d MMM yyyy")}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                    Submitted {format(new Date(l.createdAt), "d MMM yyyy, hh:mm a")}
                  </p>
                </div>
                <div className="shrink-0">
                  {l.status === "PENDING" ? (
                    <button onClick={() => { setReviewing(l); setAction("APPROVED"); setComment(""); }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500">
                      Review
                    </button>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      l.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>{l.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReviewing(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Review Leave Request</h2>
              <button onClick={() => setReviewing(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff</span>
                  <span className="font-medium text-slate-900 dark:text-white">{reviewing.staff?.fullName}</span>
                </div>
                {reviewing.correctPunchIn && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Period</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {format(new Date(reviewing.correctPunchIn), "d MMM")} – {format(new Date(reviewing.correctPunchOut), "d MMM yyyy")}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-slate-400 text-xs mb-1">Reason</p>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">{reviewing.reason}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["APPROVED","REJECTED"] as const).map(a => (
                  <button key={a} onClick={() => setAction(a)}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2 ${
                      action === a
                        ? a === "APPROVED" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                           : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                        : "border-slate-200 dark:border-slate-700 text-slate-500"
                    }`}>
                    {a === "APPROVED" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {a === "APPROVED" ? "Approve" : "Reject"}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Comment (optional)</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                  placeholder="Add a note for the staff member..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setReviewing(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Cancel
                </button>
                <button onClick={review} disabled={saving}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 ${
                    action === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
                  }`}>
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {action === "APPROVED" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
