// app/(admin)/staff/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit2, Mail, Phone, Building2, Calendar,
  Clock, MapPin, UserX, UserCheck, Shield, CheckCircle2,
  AlertCircle, RefreshCw, Save,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_COLORS: Record<string,string> = {
  PRESENT:"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  LATE:"bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ABSENT:"bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  OVERTIME:"bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  EARLY_LEAVE:"bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MISSED_PUNCH_OUT:"bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const EMP_STATUS_COLORS: Record<string,string> = {
  ACTIVE:"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  INACTIVE:"bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  SUSPENDED:"bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  TERMINATED:"bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ON_LEAVE:"bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function StaffProfilePage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [data,   setData]   = useState<any>(null);
  const [loading,setLoading]= useState(true);
  const [editing,setEditing]= useState(false);
  const [saving, setSaving] = useState(false);
  const [success,setSuccess]= useState(false);
  const [error,  setError]  = useState<string|null>(null);
  const [form,   setForm]   = useState<any>({});
  const [deps,   setDeps]   = useState<any[]>([]);
  const [branches,setBranches]=useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/staff/${id}`).then(r=>r.json()).then(d => {
      if (d.success) { setData(d.data); setForm({ ...d.data, ...d.data.user }); }
      setLoading(false);
    });
    Promise.all([
      fetch("/api/admin/options?type=departments").then(r=>r.json()),
      fetch("/api/admin/options?type=branches").then(r=>r.json()),
      fetch("/api/admin/options?type=shifts").then(r=>r.json()),
    ]).then(([d,b,s]) => { setDeps(d.data||[]); setBranches(b.data||[]); setShifts(s.data||[]); });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(false);
    const res  = await fetch(`/api/staff/${id}`, {
      method: "PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        fullName: form.fullName, position: form.position,
        email: form.email, phone: form.phone,
        departmentId: form.departmentId, branchId: form.branchId,
        shiftId: form.shiftId, employmentStatus: form.employmentStatus,
        joiningDate: form.joiningDate, notes: form.notes,
        role: form.role,
      }),
    });
    const d = await res.json();
    if (!d.success) { setError(d.error); }
    else { setSuccess(true); setData(d.data); setEditing(false); setTimeout(()=>setSuccess(false),3000); }
    setSaving(false);
  }

  async function toggleStatus() {
    const isActive = data?.employmentStatus === "ACTIVE";
    if (!confirm(isActive ? "Deactivate this staff member? They will lose access immediately." : "Reactivate this staff member?")) return;
    if (isActive) {
      const res = await fetch(`/api/staff/${id}`, { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reason:"Status changed by admin"}) });
      const d   = await res.json();
      if (d.success) { setData((p:any) => ({...p, employmentStatus:"INACTIVE"})); }
    } else {
      const res = await fetch(`/api/staff/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({employmentStatus:"ACTIVE"}) });
      const d   = await res.json();
      if (d.success) setData((p:any) => ({...p, employmentStatus:"ACTIVE"}));
    }
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i=><div key={i} className="h-32 skeleton rounded-2xl" />)}
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center">
      <p className="text-slate-400">Staff member not found.</p>
      <Link href="/admin/staff" className="text-indigo-600 text-sm mt-2 inline-block">← Back to staff</Link>
    </div>
  );

  const recentRecords = data.attendanceRecords || [];
  const isActive = data.employmentStatus === "ACTIVE";

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/staff" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{data.fullName}</h1>
          <p className="text-xs text-slate-400">{data.user?.employeeId} · {data.position || "Staff"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleStatus}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              isActive
                ? "border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            }`}>
            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            {isActive ? "Deactivate" : "Reactivate"}
          </button>
          <button onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500">
            <Edit2 className="w-3.5 h-3.5" />
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Changes saved successfully.</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — profile */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xl font-bold mx-auto mb-3">
              {data.fullName.split(" ").map((n:string)=>n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <p className="font-bold text-slate-900 dark:text-white">{data.fullName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{data.user?.employeeId}</p>
            <div className="flex gap-2 justify-center mt-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${EMP_STATUS_COLORS[data.employmentStatus] || ""}`}>
                {data.employmentStatus?.replace("_"," ")}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {data.user?.role?.replace("_"," ")}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            {[
              { icon: Mail,      v: data.user?.email    || "—" },
              { icon: Phone,     v: data.user?.phone    || "—" },
              { icon: Building2, v: data.department?.name || "—" },
              { icon: Building2, v: data.branch?.name   || "—" },
              { icon: Calendar,  v: data.joiningDate ? format(new Date(data.joiningDate), "d MMM yyyy") : "—" },
              { icon: Clock,     v: data.shift ? `${data.shift.name} (${data.shift.startTime}–${data.shift.endTime})` : "—" },
            ].map(({ icon: Icon, v }, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <Icon className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — edit form or recent attendance */}
        <div className="lg:col-span-2 space-y-4">
          {editing ? (
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Staff Member</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Full Name</label>
                  <input value={form.fullName||""} onChange={e=>setForm({...form,fullName:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                  <input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
                  <input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Position</label>
                  <input value={form.position||""} onChange={e=>setForm({...form,position:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                  <select value={form.employmentStatus||"ACTIVE"} onChange={e=>setForm({...form,employmentStatus:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    {["ACTIVE","INACTIVE","SUSPENDED","TERMINATED","ON_LEAVE"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Department</label>
                  <select value={form.departmentId||""} onChange={e=>setForm({...form,departmentId:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">Select...</option>
                    {deps.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Branch</label>
                  <select value={form.branchId||""} onChange={e=>setForm({...form,branchId:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">Select...</option>
                    {branches.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Shift</label>
                  <select value={form.shiftId||""} onChange={e=>setForm({...form,shiftId:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="">Select...</option>
                    {shifts.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Role</label>
                  <select value={form.role||"STAFF"} onChange={e=>setForm({...form,role:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Joining Date</label>
                  <input type="date" value={form.joiningDate ? format(new Date(form.joiningDate), "yyyy-MM-dd") : ""} onChange={e=>setForm({...form,joiningDate:e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                  <textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} rows={2}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 hover:bg-indigo-500">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </form>
          ) : (
            /* Recent Attendance */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Attendance</h2>
                <Link href={`/admin/attendance?staffId=${data.id}`} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">View all →</Link>
              </div>
              {recentRecords.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">No attendance records yet</div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {recentRecords.map((r:any) => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{format(new Date(r.date), "EEE, d MMM yyyy")}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {r.punchIn  ? format(new Date(r.punchIn),  "hh:mm a") : "—"}
                          {" → "}
                          {r.punchOut ? format(new Date(r.punchOut), "hh:mm a") : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-500"}`}>
                          {r.status?.replace(/_/g," ")}
                        </span>
                        {r.totalWorkedMinutes > 0 && (
                          <p className="text-xs text-slate-400 mt-1">{Math.floor(r.totalWorkedMinutes/60)}h {r.totalWorkedMinutes%60}m</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Last login */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400">
                Last login: {data.user?.lastLoginAt ? format(new Date(data.user.lastLoginAt), "d MMM yyyy, hh:mm a") : "Never"}
              </p>
              {data.user?.isActive ? (
                <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">Account active</span>
              ) : (
                <span className="ml-auto text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">Account inactive</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
