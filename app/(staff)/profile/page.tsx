// app/(staff)/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Building2, Calendar, Clock, LogOut, Shield, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.success) setProfile(d.data);
      setLoading(false);
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-5 space-y-4">
      {[1,2,3].map(i=><div key={i} className="h-24 skeleton rounded-2xl" />)}
    </div>
  );

  const p = profile?.profile;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header with avatar */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-5 pt-8 pb-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-2xl font-bold mb-3 border-4 border-white/10">
            {p?.fullName?.split(" ").map((n:string) => n[0]).join("").slice(0,2).toUpperCase() || "?"}
          </div>
          <h1 className="text-xl font-bold text-white">{p?.fullName || "—"}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{p?.position || "Staff"}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-medium">
              {profile?.employeeId || "—"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
              {profile?.role?.replace("_"," ")}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4 pb-8">
        {/* Info card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Info</p>
          </div>
          {[
            { icon: Mail,      label: "Email",      value: profile?.email || "—" },
            { icon: Phone,     label: "Phone",      value: profile?.phone || "—" },
            { icon: Building2, label: "Department", value: p?.department?.name || "—" },
            { icon: Building2, label: "Branch",     value: p?.branch?.name || "—" },
            { icon: Calendar,  label: "Joined",     value: p?.joiningDate ? format(new Date(p.joiningDate), "d MMM yyyy") : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
              <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">{label}</p>
                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Shift info */}
        {p?.shift && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Assigned Shift</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${p.shift.color}20` }}>
                <Clock className="w-5 h-5" style={{ color: p.shift.color }} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{p.shift.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.shift.startTime} – {p.shift.endTime}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</p>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-slate-400" />
            </div>
            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 text-left font-medium">Change Password</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm text-red-600 dark:text-red-400 font-medium">Sign Out</span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-300 dark:text-slate-700">StaffTrack PWA v1.0</p>
      </div>
    </div>
  );
}
