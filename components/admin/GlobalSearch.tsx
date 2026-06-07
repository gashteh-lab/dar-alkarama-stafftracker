// components/admin/GlobalSearch.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Users, Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "text-emerald-500", LATE: "text-amber-500",
  ABSENT: "text-red-500", OVERTIME: "text-purple-500",
};

export default function GlobalSearch() {
  const router      = useRouter();
  const [open,      setOpen]    = useState(false);
  const [query,     setQuery]   = useState("");
  const [results,   setResults] = useState<any>(null);
  const [loading,   setLoading] = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) setResults(data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  }

  function navigate(url: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(url);
  }

  const hasResults = results && (
    results.staff?.length > 0 ||
    results.attendance?.length > 0
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left hidden lg:block">Search...</span>
        <kbd className="hidden lg:block text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400">⌘K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Search className={`w-4 h-4 shrink-0 ${loading ? "text-indigo-500 animate-pulse" : "text-slate-400"}`} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleChange(e.target.value)}
                placeholder="Search staff, attendance, corrections..."
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none"
                autoComplete="off"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults(null); }} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!query && !results && (
                <div className="py-10 text-center">
                  <Search className="w-8 h-8 mx-auto mb-2 text-slate-200 dark:text-slate-700" />
                  <p className="text-sm text-slate-400">Type to search staff, attendance records...</p>
                </div>
              )}

              {query.length >= 2 && !loading && !hasResults && (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400">No results for &quot;{query}&quot;</p>
                </div>
              )}

              {results?.staff?.length > 0 && (
                <div>
                  <p className="px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
                    <Users className="w-3 h-3" />Staff ({results.staff.length})
                  </p>
                  {results.staff.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/admin/staff/${s.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-semibold text-xs shrink-0">
                        {s.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {s.user?.employeeId} · {s.position || s.user?.role?.replace("_", " ")} · {s.department?.name || "No dept"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.shift?.name && (
                          <div className="w-2 h-2 rounded-full" style={{ background: s.shift?.color || "#6366f1" }} />
                        )}
                        <span className={`text-[10px] font-semibold ${
                          s.employmentStatus === "ACTIVE" ? "text-emerald-500" : "text-slate-400"
                        }`}>{s.employmentStatus?.replace("_", " ")}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results?.attendance?.length > 0 && (
                <div>
                  <p className="px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
                    <Clock className="w-3 h-3" />Recent Attendance ({results.attendance.length})
                  </p>
                  {results.attendance.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/admin/attendance?staffId=${r.staffId}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                    >
                      <div className={`w-2 h-8 rounded-full shrink-0 ${
                        r.status === "PRESENT" ? "bg-emerald-400" :
                        r.status === "LATE"    ? "bg-amber-400"   :
                        r.status === "ABSENT"  ? "bg-red-400"     : "bg-slate-300"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{r.staff?.fullName}</p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(r.date), "EEE d MMM yyyy")} · {r.shift?.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-semibold ${STATUS_COLORS[r.status] || "text-slate-400"}`}>
                          {r.status?.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {r.punchIn ? format(new Date(r.punchIn), "HH:mm") : "—"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-[10px] text-slate-300 dark:text-slate-600">
                Search staff by name, ID, or email
              </p>
              <div className="flex items-center gap-3 text-[10px] text-slate-300 dark:text-slate-600">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
                <span>ESC close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
