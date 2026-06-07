// app/(admin)/staff/import/page.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, CheckCircle2, AlertCircle, X, FileText, RefreshCw, ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";

const REQUIRED_COLS  = ["employeeId", "fullName"];
const OPTIONAL_COLS  = ["email", "phone", "position", "department", "branch", "shiftName", "joiningDate", "role"];
const SAMPLE_ROWS = [
  ["EMP006","Sara Ahmed","sara@company.com","+971501234567","Engineer","Operations","Head Office","Morning Shift","2024-01-15","STAFF"],
  ["EMP007","Khalid Hassan","khalid@company.com","+971509876543","Supervisor","Security","Airport","Afternoon Shift","2024-02-01","STAFF"],
  ["MGR002","Fatima Ali","fatima@company.com","+971506543210","HR Officer","Human Resources","Head Office","Office Hours","2023-06-01","MANAGER"],
];

interface ParsedRow {
  rowNum:     number;
  employeeId: string;
  fullName:   string;
  email?:     string;
  phone?:     string;
  position?:  string;
  department?: string;
  branch?:    string;
  shiftName?: string;
  joiningDate?: string;
  role?:      string;
  _errors:    string[];
}

interface ImportResult {
  imported: number;
  failed:   number;
  errors:   { row: string; error: string }[];
  message:  string;
}

export default function StaffImportPage() {
  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [fileName,   setFileName]   = useState("");
  const [step,       setStep]       = useState<"upload"|"preview"|"done">("upload");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const headerRow = ["employeeId","fullName","email","phone","position","department","branch","shiftName","joiningDate","role"];
    const csv = [headerRow, ...SAMPLE_ROWS].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "stafftrack-import-template.csv";
    a.click();
  }

  function handleFile(file: File) {
    if (!file) return;
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setParseError("Only CSV files are supported.");
      return;
    }
    setFileName(file.name);
    setParseError(null);

    Papa.parse(file, {
      header:    true,
      skipEmptyLines: true,
      complete:  (results) => {
        const cols = results.meta.fields || [];
        setHeaders(cols);

        // Check required columns
        const missing = REQUIRED_COLS.filter(c => !cols.includes(c));
        if (missing.length > 0) {
          setParseError(`Missing required columns: ${missing.join(", ")}. Download the template to see correct format.`);
          return;
        }

        const parsed: ParsedRow[] = (results.data as any[]).map((row, i) => {
          const errors: string[] = [];
          if (!row.employeeId?.trim())  errors.push("Employee ID required");
          if (!row.fullName?.trim())    errors.push("Full name required");
          if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("Invalid email");
          if (row.joiningDate && isNaN(Date.parse(row.joiningDate)))       errors.push("Invalid joining date (use YYYY-MM-DD)");

          return {
            rowNum:     i + 2, // +2 for header row + 1-indexed
            employeeId: row.employeeId?.trim()   || "",
            fullName:   row.fullName?.trim()      || "",
            email:      row.email?.trim()         || undefined,
            phone:      row.phone?.trim()         || undefined,
            position:   row.position?.trim()      || undefined,
            department: row.department?.trim()    || undefined,
            branch:     row.branch?.trim()        || undefined,
            shiftName:  row.shiftName?.trim()     || undefined,
            joiningDate:row.joiningDate?.trim()   || undefined,
            role:       row.role?.trim()          || undefined,
            _errors:    errors,
          };
        });

        setRows(parsed);
        setStep("preview");
      },
      error: (err) => setParseError(`Parse error: ${err.message}`),
    });
  }

  const validRows   = rows.filter(r => r._errors.length === 0);
  const invalidRows = rows.filter(r => r._errors.length > 0);

  async function runImport() {
    if (validRows.length === 0) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/staff/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: validRows, preview: false }),
      });
      const data = await res.json();
      setResult(data.data ? { ...data.data, message: data.message } : { imported: 0, failed: 0, errors: [], message: data.error });
      setStep("done");
    } catch { setResult({ imported: 0, failed: 0, errors: [{ row: "—", error: "Network error" }], message: "Import failed" }); }
    finally { setLoading(false); }
  }

  function reset() { setRows([]); setHeaders([]); setFileName(""); setStep("upload"); setResult(null); setParseError(null); }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/staff" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Import Staff</h1>
          <p className="text-sm text-slate-500 mt-0.5">Upload a CSV file to add multiple staff members at once</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {["upload","preview","done"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? "bg-indigo-600 text-white" :
              ["upload","preview","done"].indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
            }`}>{["upload","preview","done"].indexOf(step) > i ? "✓" : i+1}</div>
            <span className={`text-xs font-medium capitalize ${step === s ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>{s}</span>
            {i < 2 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Upload CSV File</h2>
              <button onClick={downloadTemplate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                <Download className="w-3.5 h-3.5" />Download template
              </button>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors group"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop your CSV here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">CSV format · Max 500 rows</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>

          {/* Format guide */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Required CSV Format</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Column</th>
                    <th className="text-left py-2 pr-4 text-slate-500 font-semibold">Required</th>
                    <th className="text-left py-2 text-slate-500 font-semibold">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { col:"employeeId",  req:true,  ex:"EMP001" },
                    { col:"fullName",    req:true,  ex:"Ahmed Al Rashidi" },
                    { col:"email",       req:false, ex:"ahmed@company.com" },
                    { col:"phone",       req:false, ex:"+971501234567" },
                    { col:"position",    req:false, ex:"Ground Handler" },
                    { col:"department",  req:false, ex:"Operations (must match existing)" },
                    { col:"branch",      req:false, ex:"Dubai Airport (must match existing)" },
                    { col:"shiftName",   req:false, ex:"Morning Shift (must match existing)" },
                    { col:"joiningDate", req:false, ex:"2024-01-15 (YYYY-MM-DD)" },
                    { col:"role",        req:false, ex:"STAFF / MANAGER / ADMIN" },
                  ].map(r => (
                    <tr key={r.col} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <td className="py-2 pr-4 font-mono text-slate-700 dark:text-slate-300">{r.col}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.req ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                          {r.req ? "Required" : "Optional"}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400">{r.ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">Default password for all imported staff: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">Welcome@123</code></p>
          </div>
        </div>
      )}

      {/* Step 2 — Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{rows.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total rows</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{validRows.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Valid</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{invalidRows.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Errors</p>
            </div>
          </div>

          {/* Errors */}
          {invalidRows.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">⚠️ {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} with errors (will be skipped)</p>
              <div className="space-y-1">
                {invalidRows.slice(0,5).map(r => (
                  <p key={r.rowNum} className="text-xs text-red-600 dark:text-red-400">Row {r.rowNum}: {r._errors.join(", ")}</p>
                ))}
                {invalidRows.length > 5 && <p className="text-xs text-red-400">...and {invalidRows.length - 5} more</p>}
              </div>
            </div>
          )}

          {/* Preview table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Preview — first 10 valid rows</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {["ID","Name","Email","Position","Dept","Branch"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0,10).map(r => (
                    <tr key={r.rowNum} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{r.employeeId}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.fullName}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[120px]">{r.email || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{r.position || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{r.department || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{r.branch || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
              Start over
            </button>
            <button onClick={runImport} disabled={loading || validRows.length === 0}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-indigo-500">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? "Importing..." : `Import ${validRows.length} staff`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === "done" && result && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 text-center space-y-4">
          {result.imported > 0 ? (
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          ) : (
            <AlertCircle className="w-14 h-14 text-red-500 mx-auto" />
          )}
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{result.message}</p>
            <p className="text-sm text-slate-500 mt-1">
              {result.imported} imported · {result.failed} failed
            </p>
          </div>
          {result.errors?.length > 0 && (
            <div className="text-left bg-red-50 dark:bg-red-900/10 rounded-xl p-3">
              {result.errors.slice(0,5).map((e,i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400">{e.row}: {e.error}</p>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400">Default password: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">Welcome@123</code></p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
              Import more
            </button>
            <Link href="/admin/staff" className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500">
              View staff list
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
