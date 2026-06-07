// app/(admin)/corrections/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, ChevronRight, RefreshCw, X, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const REQUEST_TYPE_LABELS: Record<string,string> = {
  FORGOT_PUNCH_IN: "Forgot Punch In", FORGOT_PUNCH_OUT: "Forgot Punch Out",
  WRONG_LOCATION: "Wrong Location", TECHNICAL_ISSUE: "Technical Issue",
  SHIFT_ISSUE: "Shift Issue", APPROVED_LEAVE: "Approved Leave", OTHER: "Other",
};

function ReviewModal({ request, onClose, onDone }: { request: any; onClose: ()=>void; onDone: ()=>void }) {
  const [action,  setAction]  = useState<"APPROVED"|"REJECTED">("APPROVED");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string|null>(null);

  async function submit() {
    setLoading(true); setError(null);
    const res  = await fetch(`/api/corrections/${request.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ status: action, comment }),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error); setLoading(false); return; }
    onDone(); onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Review Request</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /><p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {/* Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Staff</span>
              <span className="font-medium text-slate-900 dark:text-white">{request.staff?.fullName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Date</span>
              <span className="font-medium text-slate-900 dark:text-white">{format(new Date(request.date), "d MMM yyyy")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Type</span>
              <span className="font-medium text-slate-900 dark:text-white">{REQUEST_TYPE_LABELS[request.requestType]}</span>
            </div>
            {request.correctPunchIn && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Correct In</span>
                <span className="font-mono text-slate-900 dark:text-white">{format(new Date(request.correctPunchIn), "hh:mm a")}</span>
              </div>
            )}
            {request.correctPunchOut && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Correct Out</span>
                <span className="font-mono text-slate-900 dark:text-white">{format(new Date(request.correctPunchOut), "hh:mm a")}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Reason</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{request.reason}</p>
            </div>
          </div>

          {/* Action */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>setAction("APPROVED")}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2
                ${action==="APPROVED" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
              <CheckCircle2 className="w-4 h-4" />Approve
            </button>
            <button onClick={()=>setAction("REJECTED")}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2
                ${action==="REJECTED" ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
              <XCircle className="w-4 h-4" />Reject
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Comment (optional)</label>
            <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2}
              placeholder="Add a note for the staff member..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
            <button onClick={submit} disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2
                ${action==="APPROVED" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {action==="APPROVED" ? "Approve" : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCorrectionsPage() {
  const [requests,  setRequests]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [status,    setStatus]    = useState("PENDING");
  const [reviewing, setReviewing] = useState<any>(null);
  const [pagination,setPagination]= useState({total:0,pages:1});
  const [page,      setPage]      = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) p.set("status", status);
    const res  = await fetch(`/api/corrections?${p}`);
    const data = await res.json();
    if (data.success) { setRequests(data.data.requests); setPagination(data.data.pagination); }
    setLoading(false);
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Correction Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pagination.total} total · {pendingCount} pending review</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {["PENDING","APPROVED","REJECTED",""].map(s => (
          <button key={s} onClick={()=>{setStatus(s);setPage(1);}}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              status===s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i=><div key={i} className="h-20 skeleton rounded-xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">No {status.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {requests.map(r => {
              const isPending = r.status === "PENDING";
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-10 rounded-full shrink-0 ${
                      r.status==="APPROVED" ? "bg-emerald-400" : r.status==="REJECTED" ? "bg-red-400" : "bg-amber-400"
                    }`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{r.staff?.fullName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(r.date), "d MMM yyyy")} · {REQUEST_TYPE_LABELS[r.requestType]}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{r.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right hidden md:block">
                      {r.correctPunchIn && <p className="text-xs font-mono text-slate-500">{format(new Date(r.correctPunchIn),"hh:mm a")}</p>}
                      {r.correctPunchOut && <p className="text-xs font-mono text-slate-500">{format(new Date(r.correctPunchOut),"hh:mm a")}</p>}
                      <p className="text-[10px] text-slate-300 dark:text-slate-600">{format(new Date(r.createdAt),"d MMM")}</p>
                    </div>
                    {isPending ? (
                      <button onClick={() => setReviewing(r)}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 whitespace-nowrap">
                        Review
                      </button>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        r.status==="APPROVED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>{r.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400">Page {page} of {pagination.pages}</p>
            <div className="flex gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-slate-700 disabled:opacity-40">←</button>
              <button onClick={()=>setPage(p=>Math.min(pagination.pages,p+1))} disabled={page===pagination.pages} className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-slate-700 disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {reviewing && <ReviewModal request={reviewing} onClose={() => setReviewing(null)} onDone={load} />}
    </div>
  );
}
