// app/(manager)/approvals/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, RefreshCw, X, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  FORGOT_PUNCH_IN: "Forgot Punch In", FORGOT_PUNCH_OUT: "Forgot Punch Out",
  WRONG_LOCATION: "Wrong Location",   TECHNICAL_ISSUE: "Technical Issue",
  SHIFT_ISSUE: "Shift Issue",          APPROVED_LEAVE: "Leave Request",
  OTHER: "Other",
};

function ReviewModal({ item, onClose, onDone }: { item: any; onClose: () => void; onDone: () => void }) {
  const [action,  setAction]  = useState<"APPROVED"|"REJECTED">("APPROVED");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string|null>(null);

  async function submit() {
    setLoading(true); setError(null);
    const res  = await fetch(`/api/corrections/${item.id}`, {
      method: "PUT", headers: {"Content-Type":"application/json"},
      body:   JSON.stringify({ status: action, comment }),
    });
    const data = await res.json();
    if (!data.success) { setError(data.error); setLoading(false); return; }
    onDone(); onClose();
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Review Request</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Staff</span><span className="font-medium text-slate-900 dark:text-white">{item.staff?.fullName}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="font-medium text-slate-900 dark:text-white">{TYPE_LABELS[item.requestType]}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="font-medium text-slate-900 dark:text-white">{format(new Date(item.date), "d MMM yyyy")}</span></div>
            <div><p className="text-slate-400 text-xs mb-1">Reason</p><p className="text-slate-700 dark:text-slate-300 text-xs">{item.reason}</p></div>
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
            <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">Cancel</button>
            <button onClick={submit} disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 ${action === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {action === "APPROVED" ? "Approve" : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagerApprovalsPage() {
  const [items,     setItems]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [reviewing, setReviewing] = useState<any>(null);
  const [status,    setStatus]    = useState("PENDING");

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/corrections?status=${status}&limit=50`);
    const data = await res.json();
    if (data.success) setItems(data.data.requests);
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const pending = items.filter(i => i.status === "PENDING").length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Approvals</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {pending > 0 ? `${pending} pending review` : "All caught up"}
        </p>
      </div>

      <div className="flex gap-2">
        {["PENDING","APPROVED","REJECTED",""].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors relative ${
              status === s ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}>
            {s || "All"}
            {s === "PENDING" && pending > 0 && status !== "PENDING" && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pending}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 skeleton rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">No {status.toLowerCase()} requests</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {items.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  item.status === "APPROVED" ? "bg-emerald-400" :
                  item.status === "REJECTED" ? "bg-red-400" : "bg-amber-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.staff?.fullName}</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">{TYPE_LABELS[item.requestType]}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.reason}</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                    {format(new Date(item.date), "d MMM yyyy")} · {format(new Date(item.createdAt), "hh:mm a")}
                  </p>
                </div>
                <div className="shrink-0">
                  {item.status === "PENDING" ? (
                    <button onClick={() => setReviewing(item)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold">Review</button>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      item.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>{item.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewing && <ReviewModal item={reviewing} onClose={() => setReviewing(null)} onDone={load} />}
    </div>
  );
}
