// app/(admin)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Clock, UserCheck, UserX, AlertTriangle,
  TrendingUp, ClipboardList, Shield, RefreshCw,
  ArrowUpRight, Wifi
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalStaff:         number;
    presentToday:       number;
    absentToday:        number;
    lateToday:          number;
    onDutyNow:          number;
    notPunchedIn:       number;
    pendingCorrections: number;
    missedPunchOuts:    number;
    attendanceRate:     number;
  };
  weeklyChart:   { date: string; present: number; late: number; absent: number }[];
  deptBreakdown: { name: string; present: number; absent: number; total: number }[];
  recentAudit:   { id: string; action: string; userName: string; timestamp: string; ipAddress: string }[];
  serverTime:    string;
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, iconColor, iconBg, change, href, highlight,
}: {
  label:     string;
  value:     number | string;
  icon:      any;
  iconColor: string;
  iconBg:    string;
  change?:   string;
  href?:     string;
  highlight?: "green" | "red" | "amber" | "purple" | "blue";
}) {
  const highlightMap = {
    green:  "border-l-4 border-l-emerald-400",
    red:    "border-l-4 border-l-red-400",
    amber:  "border-l-4 border-l-amber-400",
    purple: "border-l-4 border-l-purple-400",
    blue:   "border-l-4 border-l-blue-400",
  };

  const card = (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow ${highlight ? highlightMap[highlight] : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {change && (
          <span className="text-xs text-slate-400">{change}</span>
        )}
        {href && <ArrowUpRight className="w-4 h-4 text-slate-300" />}
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

// ─────────────────────────────────────────
// AUDIT ACTION BADGE
// ─────────────────────────────────────────
function ActionBadge({ action }: { action: string }) {
  const map: Record<string, string> = {
    LOGIN:         "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    LOGOUT:        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    PUNCH_IN:      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PUNCH_OUT:     "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    PUNCH_FAILED:  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    STAFF_CREATED: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    ACCOUNT_LOCKED:"bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    GEOFENCE_VIOLATION: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    LOGIN_FAILED:  "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  const className = map[action] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${className}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

// ─────────────────────────────────────────
// CHART TOOLTIP
// ─────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-900 dark:text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-500 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function AdminDashboard() {
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        setLastRefresh(new Date());
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [load]);

  const s = data?.stats;

  return (
    <div className="p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:block">Refresh</span>
        </button>
      </div>

      {/* ── Attendance rate banner ── */}
      {s && (
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Today's Attendance Rate</p>
              <p className="text-4xl font-bold mt-1">{s.attendanceRate}%</p>
              <p className="text-indigo-200 text-sm mt-1">
                {s.presentToday} of {s.totalStaff} staff present
              </p>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold">{s.onDutyNow}</p>
                <p className="text-[10px] text-indigo-200">on duty</p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${s.attendanceRate}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 skeleton rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Staff"           value={s?.totalStaff   || 0} icon={Users}        iconColor="text-blue-600"    iconBg="bg-blue-50 dark:bg-blue-900/30"    href="/admin/staff"       highlight="blue"   />
          <StatCard label="Present Today"         value={s?.presentToday || 0} icon={UserCheck}    iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/30" href="/admin/attendance" highlight="green"  />
          <StatCard label="Absent Today"          value={s?.absentToday  || 0} icon={UserX}        iconColor="text-red-600"     iconBg="bg-red-50 dark:bg-red-900/30"      href="/admin/attendance"  highlight="red"    />
          <StatCard label="Late Arrivals"         value={s?.lateToday    || 0} icon={Clock}        iconColor="text-amber-600"   iconBg="bg-amber-50 dark:bg-amber-900/30"  href="/admin/attendance"  highlight="amber"  />
          <StatCard label="On Duty Now"           value={s?.onDutyNow    || 0} icon={Wifi}         iconColor="text-purple-600"  iconBg="bg-purple-50 dark:bg-purple-900/30"                          highlight="purple" />
          <StatCard label="Not Punched In"        value={s?.notPunchedIn || 0} icon={AlertTriangle} iconColor="text-orange-600" iconBg="bg-orange-50 dark:bg-orange-900/30" href="/admin/attendance" />
          <StatCard label="Pending Corrections"   value={s?.pendingCorrections || 0} icon={ClipboardList} iconColor="text-indigo-600" iconBg="bg-indigo-50 dark:bg-indigo-900/30" href="/admin/corrections" />
          <StatCard label="Missed Punch-Outs"     value={s?.missedPunchOuts    || 0} icon={TrendingUp}    iconColor="text-slate-600"  iconBg="bg-slate-100 dark:bg-slate-800"     href="/admin/attendance" />
        </div>
      )}

      {/* ── Charts + Dept Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Weekly chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">7-Day Attendance</h2>
            <Link href="/admin/reports" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
              Full report <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.weeklyChart || []} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="present" name="Present" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="late"    name="Late"    fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-5">Dept. Attendance</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
            </div>
          ) : data?.deptBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {(data?.deptBreakdown || []).map((dept) => {
                const rate = dept.total > 0 ? Math.round((dept.present / dept.total) * 100) : 0;
                return (
                  <div key={dept.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{dept.name}</span>
                      <span className="text-xs text-slate-400">{dept.present}/{dept.total}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-emerald-400" : rate >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{rate}% attendance</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
          </div>
          <Link href="/admin/audit" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
            View audit log <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-10 skeleton rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-1">
            {(data?.recentAudit || []).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <ActionBadge action={log.action} />
                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{log.userName}</span>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400">{format(new Date(log.timestamp), "hh:mm a")}</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600">{log.ipAddress}</p>
                </div>
              </div>
            ))}
            {(data?.recentAudit || []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No recent activity</p>
            )}
          </div>
        )}
      </div>

      {/* ── Last refreshed ── */}
      <p className="text-xs text-slate-400 text-center">
        Last updated {format(lastRefresh, "hh:mm:ss a")} · Auto-refreshes every 60s
      </p>
    </div>
  );
}
