// components/admin/AdminShell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Clock, MapPin, ClipboardList,
  BarChart3, Settings, Bell, Shield, LogOut, Menu, X,
  ChevronRight, Fingerprint, AlertTriangle, Calendar,
} from "lucide-react";
import type { SessionUser } from "@/types";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/notifications",  icon: Bell,            label: "Notifications", badge: true },
    ],
  },
  {
    label: "Workforce",
    items: [
      { href: "/admin/staff",         icon: Users,          label: "Staff" },
      { href: "/admin/attendance",    icon: Clock,          label: "Attendance" },
      { href: "/admin/corrections",   icon: ClipboardList,  label: "Corrections", badge: true },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/admin/shifts",        icon: Calendar,       label: "Shifts" },
      { href: "/admin/locations",     icon: MapPin,         label: "Locations" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/admin/reports",       icon: BarChart3,      label: "Reports" },
      { href: "/admin/audit",         icon: Shield,         label: "Audit Log" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings",      icon: Settings,       label: "Settings" },
    ],
  },
];

function NavItem({
  href, icon: Icon, label, isActive, pendingCount, onClick,
}: {
  href: string; icon: any; label: string; isActive: boolean;
  pendingCount?: number; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
        ${isActive
          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
    >
      <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
      <span className="flex-1">{label}</span>
      {pendingCount ? (
        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full min-w-[18px] text-center">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      ) : null}
      {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
    </Link>
  );
}

export default function AdminShell({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
            <Fingerprint className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">StaffTrack</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">
              {session.role === "SUPER_ADMIN" ? "Super Admin" : session.role === "ADMIN" ? "Admin" : "Manager"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  isActive={pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-semibold text-xs shrink-0">
            {session.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{session.fullName}</p>
            <p className="text-[10px] text-slate-400 truncate">{session.email || session.employeeId}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 px-5 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white">
              {NAV_SECTIONS.flatMap((s) => s.items).find((i) => pathname.startsWith(i.href))?.label || "Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 hidden sm:block">Live</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
