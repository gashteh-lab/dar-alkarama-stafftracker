// app/(admin)/reports/print/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";

function PrintReportContent() {
  const searchParams = useSearchParams();
  const [records, setRecords]  = useState<any[]>([]);
  const [loading, setLoading]  = useState(true);
  const [company, setCompany]  = useState("StaffTrack");

  const startDate = searchParams.get("startDate") || startOfMonth(new Date()).toISOString();
  const endDate   = searchParams.get("endDate")   || endOfMonth(new Date()).toISOString();
  const staffId   = searchParams.get("staffId")   || undefined;

  useEffect(() => {
    const p = new URLSearchParams({ startDate, endDate, limit: "200" });
    if (staffId) p.set("staffId", staffId);

    Promise.all([
      fetch(`/api/reports/attendance?${p}`).then(r => r.json()),
      fetch("/api/settings").then(r => r.json()),
    ]).then(([rData, sData]) => {
      if (rData.success) setRecords(rData.data.records);
      if (sData.success) setCompany(sData.data?.name || "StaffTrack");
      setLoading(false);
    });
  }, [startDate, endDate, staffId]);

  const STATUS_LABELS: Record<string, string> = {
    PRESENT: "Present", ABSENT: "Absent", LATE: "Late",
    EARLY_LEAVE: "Early Leave", OVERTIME: "Overtime",
    MISSED_PUNCH_OUT: "Missed Out", OFFLINE_PUNCH: "Offline",
    MANUAL_ADJUSTMENT: "Adjusted", ON_LEAVE: "On Leave",
    WEEKEND: "Weekend", HOLIDAY: "Holiday",
  };

  const totals = {
    present:  records.filter(r => ["PRESENT","LATE","OVERTIME","EARLY_LEAVE"].includes(r.status)).length,
    absent:   records.filter(r => r.status === "ABSENT").length,
    late:     records.filter(r => r.status === "LATE").length,
    hours:    records.reduce((a, r) => a + (r.totalWorkedMinutes || 0), 0) / 60,
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Screen controls */}
      <div className="no-print flex items-center gap-3 p-4 border-b border-slate-100">
        <Link href="/admin/reports" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-sm font-semibold text-slate-700 flex-1">Print Report</h1>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500">
          <Printer className="w-4 h-4" />Print
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-slate-900">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company}</h1>
            <h2 className="text-lg text-slate-600 mt-0.5">Attendance Report</h2>
            <p className="text-sm text-slate-400 mt-1">
              {format(new Date(startDate), "d MMMM yyyy")} – {format(new Date(endDate), "d MMMM yyyy")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Generated</p>
            <p className="text-sm font-medium text-slate-700">{format(new Date(), "d MMM yyyy, HH:mm")}</p>
            <p className="text-xs text-slate-400 mt-1">StaffTrack PWA</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Present",     value: totals.present,          color: "#10b981" },
            { label: "Absent",      value: totals.absent,           color: "#ef4444" },
            { label: "Late",        value: totals.late,             color: "#f59e0b" },
            { label: "Total Hours", value: totals.hours.toFixed(1)+"h", color: "#6366f1" },
          ].map(s => (
            <div key={s.label} className="border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                {["Emp ID","Name","Date","Punch In","Punch Out","Hours","Status","Dept"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold first:rounded-tl-lg last:rounded-tr-lg">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                  <td className="px-3 py-2 text-xs font-mono">{r.staff?.user?.employeeId || "—"}</td>
                  <td className="px-3 py-2 text-xs font-medium">{r.staff?.fullName || "—"}</td>
                  <td className="px-3 py-2 text-xs">{format(new Date(r.date), "d MMM yy")}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.punchIn  ? format(new Date(r.punchIn),  "HH:mm") : "—"}</td>
                  <td className="px-3 py-2 text-xs font-mono">{r.punchOut ? format(new Date(r.punchOut), "HH:mm") : "—"}</td>
                  <td className="px-3 py-2 text-xs font-mono">
                    {r.totalWorkedMinutes > 0 ? (r.totalWorkedMinutes / 60).toFixed(1)+"h" : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-semibold" style={{
                      color: r.status === "PRESENT" ? "#10b981" : r.status === "ABSENT" ? "#ef4444" :
                             r.status === "LATE"    ? "#f59e0b" : r.status === "OVERTIME" ? "#8b5cf6" : "#64748b"
                    }}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.staff?.department?.name || "—"}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400 text-sm">No records found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <p>Confidential — {company} Internal Use Only</p>
          <p>Generated by StaffTrack PWA · Total: {records.length} records</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          @page { size: A4 landscape; margin: 15mm; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

export default function PrintReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PrintReportContent />
    </Suspense>
  );
}
