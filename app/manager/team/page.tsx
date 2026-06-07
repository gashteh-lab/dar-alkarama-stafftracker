// app/(manager)/team/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserCheck, UserX, Clock, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<string,string> = {
  PRESENT:"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ABSENT:"bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LATE:"bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  EARLY_LEAVE:"bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  OVERTIME:"bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MISSED_PUNCH_OUT:"bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export default function ManagerTeamPage() {
  const [teamRecords, setTeamRecords] = useState<any[]>([]);
  const [teamStaff,   setTeamStaff]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const p = new URLSearchParams({
      startDate: new Date(today.setHours(0,0,0,0)).toISOString(),
      endDate:   new Date(today.setHours(23,59,59,999)).toISOString(),
      limit:     "100",
    });
    const [recRes, staffRes] = await Promise.all([
      fetch(`/api/reports/attendance?${p}`),
      fetch("/api/staff?limit=100"),
    ]);
    const recData   = await recRes.json();
    const staffData = await staffRes.json();

    if (recData.success)   setTeamRecords(recData.data.records);
    if (staffData.success) setTeamStaff(staffData.data.staff);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 120000); return ()=>clearInterval(t); }, [load]);

  // Merge staff with today's record
  const merged = teamStaff.filter(s =>
    !search || s.fullName.toLowerCase().includes(search.toLowerCase()) || s.user?.employeeId?.includes(search)
  ).map(s => {
    const record = teamRecords.find(r => r.staffId === s.id || r.staff?.id === s.id);
    return { ...s, record };
  });

  const onDuty   = merged.filter(s => s.record?.punchIn && !s.record?.punchOut).length;
  const present  = merged.filter(s => s.record?.punchIn).length;
  const absent   = merged.filter(s => !s.record).length;
  const late     = merged.filter(s => s.record?.status === "LATE").length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Team</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Today, {format(new Date(), "EEEE d MMMM")} · Updated {format(lastRefresh, "hh:mm a")}
          </p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Users,     label: "Total",    value: merged.length, color: "blue"   },
          { icon: UserCheck, label: "On Duty",  value: onDuty,        color: "green"  },
          { icon: UserX,     label: "Absent",   value: absent,        color: "red"    },
          { icon: Clock,     label: "Late",     value: late,          color: "amber"  },
        ].map(({ icon:Icon, label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center">
            <p className={`text-2xl font-bold ${
              color==="blue"?"text-blue-600":color==="green"?"text-emerald-600":color==="red"?"text-red-600":"text-amber-600"
            }`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search team member..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      {/* Team list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({length:6}).map((_,i)=><div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {merged.map(member => {
              const r   = member.record;
              const status = r ? r.status : null;
              const isOnDuty = r?.punchIn && !r?.punchOut;
              return (
                <div key={member.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-semibold text-sm">
                      {member.fullName.split(" ").map((n:string)=>n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      isOnDuty ? "bg-emerald-400 animate-pulse" : r ? "bg-slate-300" : "bg-red-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{member.fullName}</p>
                    <p className="text-xs text-slate-400">
                      {member.user?.employeeId} · {member.position || "Staff"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {r ? (
                      <>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[status] || "bg-slate-100 text-slate-500"}`}>
                          {status?.replace("_"," ")}
                        </span>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          {r.punchIn  ? format(new Date(r.punchIn),  "hh:mm") : "—"}
                          {" → "}
                          {r.punchOut ? format(new Date(r.punchOut), "hh:mm") : "now"}
                        </p>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        Not in
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
