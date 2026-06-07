// app/(admin)/staff/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Search, Filter, Download, Upload, MoreVertical,
  UserCheck, UserX, Edit2, Eye, ChevronLeft, ChevronRight,
  Mail, Phone, Briefcase, Building2, X, Check, AlertCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  INACTIVE:    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  SUSPENDED:   "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  TERMINATED:  "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ON_LEAVE:    "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ADMIN:       "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  MANAGER:     "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  STAFF:       "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const colors   = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700",
                    "bg-amber-100 text-amber-700",   "bg-rose-100 text-rose-700",
                    "bg-purple-100 text-purple-700",  "bg-blue-100 text-blue-700"];
  const color    = colors[name.charCodeAt(0) % colors.length];
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  return (
    <div className={`${sizeClass} rounded-full ${color} dark:bg-slate-700 dark:text-slate-300 flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

// ── Add Staff Modal ──────────────────────────────────────────
function AddStaffModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm]       = useState<Record<string, string>>({
    fullName: "", employeeId: "", email: "", phone: "",
    position: "", role: "STAFF", employmentStatus: "ACTIVE",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [deps,    setDeps]    = useState<{id:string;name:string}[]>([]);
  const [branches,setBranches]= useState<{id:string;name:string}[]>([]);
  const [shifts,  setShifts]  = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/admin/options?type=departments").then(r=>r.json()),
      fetch("/api/admin/options?type=branches").then(r=>r.json()),
      fetch("/api/admin/options?type=shifts").then(r=>r.json()),
    ]).then(([d,b,s]) => {
      setDeps(d.data||[]);
      setBranches(b.data||[]);
      setShifts(s.data||[]);
    }).catch(()=>{});
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, password: "Welcome@123" }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      onSuccess();
      onClose();
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  if (!open) return null;

  const f = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add Staff Member</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Full Name *</label>
              <input value={form.fullName} onChange={e=>f("fullName",e.target.value)} required
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" placeholder="Ahmed Al Rashidi" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Employee ID *</label>
              <input value={form.employeeId} onChange={e=>f("employeeId",e.target.value)} required
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" placeholder="EMP001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Role *</label>
              <select value={form.role} onChange={e=>f("role",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e=>f("email",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="name@company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e=>f("phone",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="+971 50 123 4567" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Position</label>
              <input value={form.position} onChange={e=>f("position",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Ground Handler" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Department</label>
              <select value={form.departmentId||""} onChange={e=>f("departmentId",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="">Select...</option>
                {deps.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Branch</label>
              <select value={form.branchId||""} onChange={e=>f("branchId",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="">Select...</option>
                {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Shift</label>
              <select value={form.shiftId||""} onChange={e=>f("shiftId",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option value="">Select...</option>
                {shifts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Joining Date</label>
              <input type="date" value={form.joiningDate||""} onChange={e=>f("joiningDate",e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>

          <p className="text-xs text-slate-400">Default password: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">Welcome@123</code> — staff must change on first login.</p>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────
export default function StaffPage() {
  const [staff,       setStaff]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1 });
  const [showAddModal,setShowAddModal]= useState(false);
  const [actionMenu,  setActionMenu]  = useState<string | null>(null);
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res  = await fetch(`/api/staff?${params}`);
      const data = await res.json();
      if (data.success) {
        setStaff(data.data.staff);
        setPagination(data.data.pagination);
      }
    } catch {} finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  async function deactivateStaff(id: string) {
    if (!confirm("Deactivate this staff member? They will lose access immediately.")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ reason: "Deactivated by admin" }) });
    load();
    setActionMenu(null);
  }

  async function exportCSV() {
    const res  = await fetch("/api/reports/export?type=staff&format=csv");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `staff-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pagination.total} total members</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">Export</span>
          </button>
          <Link href="/admin/staff/import"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:block">Import</span>
          </Link>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, ID, email, position..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Department</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Shift</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                    {[1,2,3,4,5,6,7].map(j => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Search className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-400">No staff found</p>
                      {search && <p className="text-xs text-slate-300 dark:text-slate-600">Try a different search term</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.fullName} />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{member.fullName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {member.user?.employeeId} {member.position ? `· ${member.position}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {member.user?.email && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="w-3 h-3" />{member.user.email}
                          </p>
                        )}
                        {member.user?.phone && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />{member.user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        {member.department && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <Building2 className="w-3 h-3 text-slate-400" />{member.department.name}
                          </p>
                        )}
                        {member.branch && (
                          <p className="text-xs text-slate-400">{member.branch.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      {member.shift ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: member.shift.color || "#6366f1" }} />
                          <span className="text-xs text-slate-600 dark:text-slate-300">{member.shift.name}</span>
                        </div>
                      ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${STATUS_STYLES[member.employmentStatus] || ""}`}>
                        {member.employmentStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${ROLE_STYLES[member.user?.role] || ""}`}>
                        {member.user?.role?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenu === member.id && (
                          <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 min-w-[160px] py-1">
                            <Link href={`/admin/staff/${member.id}`}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                              <Eye className="w-4 h-4" />View profile
                            </Link>
                            <Link href={`/admin/staff/${member.id}/edit`}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                              <Edit2 className="w-4 h-4" />Edit
                            </Link>
                            <Link href={`/admin/attendance?staffId=${member.id}`}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                              <Briefcase className="w-4 h-4" />Attendance
                            </Link>
                            {member.employmentStatus === "ACTIVE" && (
                              <button
                                onClick={() => deactivateStaff(member.id)}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <UserX className="w-4 h-4" />Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AddStaffModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={load} />
    </div>
  );
}
