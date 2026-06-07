// app/(staff)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, Clock, CheckCircle2, XCircle, AlertCircle,
  Wifi, WifiOff, Navigation, ChevronRight, Calendar,
  TrendingUp, Timer, Zap, AlertTriangle, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getCurrentPosition, reverseGeocode, getDeviceInfo, GeofenceError } from "@/lib/geofence";
import { queueOfflinePunch } from "@/lib/offline/indexeddb";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import type { TodayStatus, AttendanceRecord } from "@/types";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function getStatusConfig(status: string | null) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PRESENT:         { label: "Present",      color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800" },
    LATE:            { label: "Late",         color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/30",   border: "border-amber-200 dark:border-amber-800"   },
    ABSENT:          { label: "Absent",       color: "text-red-700 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/30",       border: "border-red-200 dark:border-red-800"       },
    EARLY_LEAVE:     { label: "Early Leave",  color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30", border: "border-orange-200 dark:border-orange-800" },
    OVERTIME:        { label: "Overtime",     color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", border: "border-purple-200 dark:border-purple-800" },
    OFFLINE_PUNCH:   { label: "Offline Sync", color: "text-blue-700 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-900/30",     border: "border-blue-200 dark:border-blue-800"     },
    ON_LEAVE:        { label: "On Leave",     color: "text-slate-600 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800",     border: "border-slate-200 dark:border-slate-700"   },
  };
  return map[status || ""] || { label: status || "—", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" };
}

// ─────────────────────────────────────────
// LIVE CLOCK
// ─────────────────────────────────────────

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

// ─────────────────────────────────────────
// PUNCH STATES
// ─────────────────────────────────────────

type PunchStep =
  | "idle"
  | "locating"
  | "confirming"
  | "submitting"
  | "success"
  | "error";

interface PunchState {
  step:     PunchStep;
  error:    string | null;
  gpsError: string | null;
  position: { lat: number; lng: number; accuracy: number } | null;
  address:  string | null;
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────

export default function StaffDashboard() {
  const now          = useLiveClock();
  const { isOnline, pendingCount } = useOfflineSync();

  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [punchState, setPunchState] = useState<PunchState>({
    step: "idle", error: null, gpsError: null, position: null, address: null,
  });

  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load today's status ─────────────────────────────────────
  const loadTodayStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/today");
      if (!res.ok) return;
      const { data } = await res.json();
      setTodayStatus(data);
    } catch {
      // Offline — use cached state
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const loadRecentRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/history?limit=5");
      if (!res.ok) return;
      const { data } = await res.json();
      setRecentRecords(data?.records || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadTodayStatus();
    loadRecentRecords();
  }, [loadTodayStatus, loadRecentRecords]);

  // ── Punch flow ──────────────────────────────────────────────

  const punchType = todayStatus?.isPunchedIn && !todayStatus?.isPunchedOut
    ? "PUNCH_OUT"
    : "PUNCH_IN";

  async function startPunch() {
    if (punchState.step !== "idle") return;
    setPunchState((s) => ({ ...s, step: "locating", error: null, gpsError: null }));

    try {
      const pos = await getCurrentPosition();
      const address = await reverseGeocode(pos.latitude, pos.longitude);

      setPunchState((s) => ({
        ...s,
        step:     "confirming",
        position: { lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy },
        address,
      }));

      // Auto-cancel confirm after 30s
      confirmTimeoutRef.current = setTimeout(() => {
        setPunchState((s) => s.step === "confirming" ? { ...s, step: "idle" } : s);
      }, 30000);

    } catch (err) {
      if (err instanceof GeofenceError && (err.code === "GPS_DENIED" || err.code === "GPS_UNAVAILABLE")) {
        // Allow punch without GPS if geofence not strictly required
        setPunchState((s) => ({
          ...s,
          step:     "confirming",
          gpsError: err.message,
          position: null,
          address:  null,
        }));
      } else {
        setPunchState((s) => ({
          ...s,
          step:  "error",
          error: err instanceof Error ? err.message : "GPS error. Please try again.",
        }));
      }
    }
  }

  async function confirmPunch() {
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);

    setPunchState((s) => ({ ...s, step: "submitting" }));

    const deviceInfo = getDeviceInfo();
    const timestamp  = new Date().toISOString();

    const payload = {
      type:       punchType,
      timestamp,
      latitude:   punchState.position?.lat,
      longitude:  punchState.position?.lng,
      accuracy:   punchState.position?.accuracy,
      address:    punchState.address,
      deviceInfo,
      source:     isOnline ? "ONLINE" : "OFFLINE",
      isOffline:  !isOnline,
    };

    if (!isOnline) {
      // Queue for later sync
      await queueOfflinePunch({
        staffId:   "current", // replaced by server
        type:      punchType,
        timestamp,
        latitude:  punchState.position?.lat,
        longitude: punchState.position?.lng,
        accuracy:  punchState.position?.accuracy,
        deviceInfo,
      });

      setPunchState((s) => ({ ...s, step: "success" }));
      await loadTodayStatus();
      setTimeout(() => setPunchState((s) => ({ ...s, step: "idle" })), 2500);
      return;
    }

    try {
      const res  = await fetch("/api/attendance/punch", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      const result = await res.json();

      if (!result.success) {
        setPunchState((s) => ({
          ...s,
          step:  "error",
          error: result.error || "Punch failed. Please try again.",
        }));
        return;
      }

      setPunchState((s) => ({ ...s, step: "success" }));
      await loadTodayStatus();
      await loadRecentRecords();
      setTimeout(() => setPunchState((s) => ({ ...s, step: "idle" })), 2500);

    } catch {
      setPunchState((s) => ({
        ...s,
        step:  "error",
        error: "Network error. Please check your connection.",
      }));
    }
  }

  function cancelPunch() {
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    setPunchState({ step: "idle", error: null, gpsError: null, position: null, address: null });
  }

  // ── Punch button render ─────────────────────────────────────

  const isPunchedIn  = todayStatus?.isPunchedIn  && !todayStatus?.isPunchedOut;
  const isPunchedOut = todayStatus?.isPunchedOut;

  const statusCfg = getStatusConfig(todayStatus?.currentStatus || null);

  const punchBtnConfig = {
    PUNCH_IN: {
      label:      "Punch In",
      subLabel:   "Tap to clock in for today",
      gradient:   "from-emerald-500 to-teal-500",
      shadow:     "shadow-emerald-500/30",
      ringColor:  "ring-emerald-400/30",
    },
    PUNCH_OUT: {
      label:      "Punch Out",
      subLabel:   "Tap to clock out",
      gradient:   "from-red-500 to-rose-500",
      shadow:     "shadow-red-500/30",
      ringColor:  "ring-red-400/30",
    },
  }[punchType];

  // ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 pt-4 pb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {format(now, "EEEE, d MMMM yyyy")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
              {format(now, "hh:mm")}
              <span className="text-slate-400 dark:text-slate-500 font-normal">
                :{format(now, "ss")}
              </span>
              <span className="text-base ml-1.5 text-slate-500 dark:text-slate-400">
                {format(now, "a")}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Online status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
              ${isOnline
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {isOnline
                ? <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Online</>
                : <><WifiOff className="w-3 h-3" />Offline</>
              }
            </div>

            {/* Pending sync badge */}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-xs text-blue-600 dark:text-blue-400 font-medium">
                <RefreshCw className="w-3 h-3" />
                {pendingCount}
              </div>
            )}
          </div>
        </div>

        {/* Shift info */}
        {todayStatus?.shift && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{todayStatus.shift.name}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>{todayStatus.shift.startTime} – {todayStatus.shift.endTime}</span>
            {todayStatus.isLate && !todayStatus.isPunchedIn && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-amber-500 font-medium">
                  {formatDuration(todayStatus.lateMinutes)} late
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* ── Status card ── */}
        {isLoadingStatus ? (
          <div className="h-20 skeleton rounded-2xl" />
        ) : todayStatus?.hasRecord ? (
          <div className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border ${statusCfg.bg} ${statusCfg.border}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-5 h-5 ${statusCfg.color}`} />
              <div>
                <p className={`text-sm font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {todayStatus.isPunchedIn && !todayStatus.isPunchedOut && (
                    <>On duty · {formatDuration(todayStatus.workedMinutes)} worked</>
                  )}
                  {todayStatus.isPunchedOut && (
                    <>{formatDuration(todayStatus.workedMinutes)} total</>
                  )}
                </p>
              </div>
            </div>
            {todayStatus.record?.punchIn && (
              <div className="text-right">
                <p className="text-xs text-slate-400">In: {format(new Date(todayStatus.record.punchIn), "hh:mm a")}</p>
                {todayStatus.record?.punchOut && (
                  <p className="text-xs text-slate-400 mt-0.5">Out: {format(new Date(todayStatus.record.punchOut), "hh:mm a")}</p>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* ── PUNCH BUTTON ── */}
        {!isPunchedOut && punchState.step !== "success" && (
          <div className="flex flex-col items-center py-4">
            {/* Confirm state */}
            {punchState.step === "confirming" && (
              <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm animate-slide-up">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Confirm {punchType === "PUNCH_IN" ? "Punch In" : "Punch Out"}
                </p>

                {punchState.gpsError && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">{punchState.gpsError}</p>
                  </div>
                )}

                {punchState.position && (
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {punchState.address || `${punchState.position.lat.toFixed(5)}, ${punchState.position.lng.toFixed(5)}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Accuracy: ±{Math.round(punchState.position.accuracy)}m
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(), "EEEE, d MMM · hh:mm:ss a")}
                </div>

                {!isOnline && (
                  <div className="flex items-center gap-2 mt-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <WifiOff className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Offline mode — will sync automatically when reconnected
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={cancelPunch}
                    className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPunch}
                    className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${punchBtnConfig.gradient} text-white text-sm font-semibold shadow-lg ${punchBtnConfig.shadow} active:scale-[0.98] transition-transform`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {/* Main punch button */}
            {(punchState.step === "idle" || punchState.step === "locating" || punchState.step === "submitting") && (
              <div className="relative flex items-center justify-center">
                {/* Animated ring */}
                {punchState.step === "idle" && (
                  <div className={`absolute w-44 h-44 rounded-full border-2 ${
                    punchType === "PUNCH_IN" ? "border-emerald-300 dark:border-emerald-700" : "border-red-300 dark:border-red-700"
                  } animate-ping opacity-30 pointer-events-none`} />
                )}
                <div className={`absolute w-40 h-40 rounded-full ring-8 ${punchBtnConfig.ringColor} pointer-events-none`} />

                <button
                  onClick={startPunch}
                  disabled={punchState.step !== "idle"}
                  className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${punchBtnConfig.gradient}
                    shadow-2xl ${punchBtnConfig.shadow} flex flex-col items-center justify-center gap-1.5
                    transition-all duration-200 active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed
                    select-none`}
                >
                  {punchState.step === "locating" || punchState.step === "submitting" ? (
                    <>
                      <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-white text-xs font-medium mt-1">
                        {punchState.step === "locating" ? "Getting GPS..." : "Recording..."}
                      </span>
                    </>
                  ) : (
                    <>
                      {punchType === "PUNCH_IN"
                        ? <Navigation className="w-9 h-9 text-white" />
                        : <XCircle    className="w-9 h-9 text-white" />
                      }
                      <span className="text-white font-bold text-base">{punchBtnConfig.label}</span>
                      <span className="text-white/70 text-[10px]">{punchBtnConfig.subLabel}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Error state */}
            {punchState.step === "error" && (
              <div className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 animate-slide-up">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Punch failed</p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">{punchState.error}</p>
                    <button
                      onClick={cancelPunch}
                      className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Success state ── */}
        {punchState.step === "success" && (
          <div className="flex flex-col items-center py-6 animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {punchType === "PUNCH_IN" ? "Punched In!" : "Punched Out!"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {format(new Date(), "hh:mm:ss a")}
            </p>
          </div>
        )}

        {/* ── Already completed ── */}
        {isPunchedOut && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-9 h-9 text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Shift complete</p>
            <p className="text-sm text-slate-400 mt-1">
              You've completed your attendance for today
            </p>
          </div>
        )}

        {/* ── Today stats ── */}
        {todayStatus?.hasRecord && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Timer className="w-4 h-4 text-blue-500" />}
              label="Worked"
              value={formatDuration(todayStatus.workedMinutes)}
              color="blue"
            />
            <StatCard
              icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
              label="Late"
              value={todayStatus.record?.lateMinutes ? `${todayStatus.record.lateMinutes}m` : "—"}
              color="amber"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
              label="Overtime"
              value={todayStatus.record?.overtimeMinutes ? `${todayStatus.record.overtimeMinutes}m` : "—"}
              color="purple"
            />
          </div>
        )}

        {/* ── Location status ── */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-0.5">Location access</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate">
              {typeof navigator !== "undefined" && "geolocation" in navigator
                ? "GPS available"
                : "GPS not supported"}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        </div>

        {/* ── Recent attendance ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Attendance</h2>
            <Link
              href="/attendance"
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentRecords.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                No recent attendance records
              </div>
            ) : (
              recentRecords.map((r) => {
                const cfg = getStatusConfig(r.status);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${
                        r.status === "PRESENT" ? "bg-emerald-400" :
                        r.status === "LATE"    ? "bg-amber-400" :
                        r.status === "ABSENT"  ? "bg-red-400" :
                        "bg-slate-300"
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {format(new Date(r.date), "EEE, d MMM")}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.punchIn  ? format(new Date(r.punchIn),  "hh:mm a") : "—"}
                          {" → "}
                          {r.punchOut ? format(new Date(r.punchOut), "hh:mm a") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      {r.totalWorkedMinutes > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDuration(r.totalWorkedMinutes)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Quick links ── */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link
            href="/corrections"
            className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Request</p>
              <p className="text-[10px] text-slate-400">Correction</p>
            </div>
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">History</p>
              <p className="text-[10px] text-slate-400">View records</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────

function StatCard({
  icon, label, value, color,
}: {
  icon:  React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "amber" | "purple" | "emerald";
}) {
  const colorMap = {
    blue:   "bg-blue-50   dark:bg-blue-900/30",
    amber:  "bg-amber-50  dark:bg-amber-900/30",
    purple: "bg-purple-50 dark:bg-purple-900/30",
    emerald:"bg-emerald-50 dark:bg-emerald-900/30",
  };

  return (
    <div className={`${colorMap[color]} rounded-2xl p-3.5`}>
      <div className="mb-2">{icon}</div>
      <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      <p className="text-[10px] text-slate-400 mt-1 font-medium uppercase tracking-wide">{label}</p>
    </div>
  );
}
