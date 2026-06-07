// lib/utils/index.ts
// StaffTrack — Shared utilities

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format minutes to readable duration
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

// Format worked hours to decimal
export function formatHours(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h";
  return `${(minutes / 60).toFixed(1)}h`;
}

// Get initials from full name
export function getInitials(name: string, max = 2): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, max)
    .toUpperCase();
}

// Deterministic color from string
export function getAvatarColor(str: string): string {
  const colors = [
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  ];
  const hash = str.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Attendance status display config
export const STATUS_CONFIG: Record<string, { label: string; variant: string; dot: string }> = {
  PRESENT:          { label: "Present",      variant: "green",  dot: "bg-emerald-400" },
  LATE:             { label: "Late",         variant: "amber",  dot: "bg-amber-400"   },
  ABSENT:           { label: "Absent",       variant: "red",    dot: "bg-red-400"     },
  HALF_DAY:         { label: "Half Day",     variant: "orange", dot: "bg-orange-400"  },
  EARLY_LEAVE:      { label: "Early Leave",  variant: "orange", dot: "bg-orange-400"  },
  OVERTIME:         { label: "Overtime",     variant: "purple", dot: "bg-purple-400"  },
  MISSED_PUNCH_OUT: { label: "Missed Out",   variant: "red",    dot: "bg-rose-400"    },
  OFFLINE_PUNCH:    { label: "Offline",      variant: "blue",   dot: "bg-blue-400"    },
  MANUAL_ADJUSTMENT:{ label: "Adjusted",    variant: "indigo", dot: "bg-indigo-400"  },
  ON_LEAVE:         { label: "On Leave",     variant: "gray",   dot: "bg-slate-400"   },
  WEEKEND:          { label: "Weekend",      variant: "gray",   dot: "bg-slate-200"   },
  HOLIDAY:          { label: "Holiday",      variant: "gray",   dot: "bg-slate-200"   },
};

// Clamp number
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Generate unique ID (client-safe)
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Truncate text
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

// Safely parse JSON
export function safeJSON<T>(str: string, fallback: T): T {
  try { return JSON.parse(str) as T; }
  catch { return fallback; }
}

// Format IP address (mask last octet for privacy)
export function maskIP(ip: string): string {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  return ip;
}

// Check if running as PWA
export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

// Days of week labels
export const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const DAYS_LABELS   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
