// components/ui/index.tsx
// StaffTrack — Reusable UI primitives

"use client";

import { useState, useEffect } from "react";
import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ── BUTTON ───────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  leftIcon?: React.ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:   "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-[0.98]",
  secondary: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
  danger:    "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20",
  ghost:     "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
  outline:   "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-5 py-3 text-sm rounded-xl font-semibold",
};

export function Button({
  variant = "primary", size = "md", loading, leftIcon, children, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : leftIcon}
      {children}
    </button>
  );
}

// ── CARD ─────────────────────────────────────────────────────
export function Card({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-slate-100 dark:border-slate-800", className)}>{children}</div>;
}

export function CardBody({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

// ── BADGE ────────────────────────────────────────────────────
type BadgeVariant = "green" | "red" | "amber" | "blue" | "purple" | "gray" | "indigo" | "orange";

const badgeVariants: Record<BadgeVariant, string> = {
  green:  "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  red:    "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  amber:  "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  blue:   "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  gray:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  orange: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function Badge({
  variant = "gray", children, className,
}: { variant?: BadgeVariant; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold", badgeVariants[variant], className)}>
      {children}
    </span>
  );
}

// ── SKELETON ─────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4"><Skeleton className="h-4" /></td>
      ))}
    </tr>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────
export function EmptyState({
  icon, title, description, action,
}: {
  icon:        React.ReactNode;
  title:       string;
  description?: string;
  action?:     React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── INPUT ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:      string;
  error?:      string;
  leftIcon?:   React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400",
            "placeholder-slate-400 dark:placeholder-slate-500",
            "text-slate-900 dark:text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-red-400 dark:border-red-600"
              : "border-slate-200 dark:border-slate-700",
            leftIcon && "pl-9",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

// ── SELECT ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>}
      <select
        ref={ref}
        className={cn(
          "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
          "text-slate-900 dark:text-white",
          error ? "border-red-400" : "border-slate-200 dark:border-slate-700",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
);
Select.displayName = "Select";

// ── MODAL ─────────────────────────────────────────────────────
export function Modal({
  open, onClose, title, children, size = "md",
}: {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  children: React.ReactNode;
  size?:    "sm" | "md" | "lg";
}) {
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto", widths[size])}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── TOAST (simple) ────────────────────────────────────────────
type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions { message: string; type?: ToastType; duration?: number }

let toastContainer: ((opts: ToastOptions) => void) | null = null;

export function showToast(opts: ToastOptions) {
  if (toastContainer) toastContainer(opts);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<(ToastOptions & { id: number })[]>([]);
  let counter = 0;

  useEffect(() => {
    toastContainer = (opts) => {
      const id = ++counter;
      setToasts(t => [...t, { ...opts, id }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), opts.duration || 3000);
    };
    return () => { toastContainer = null; };
  }, []);

  if (!toasts.length) return null;

  const colors: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error:   "bg-red-600",
    info:    "bg-blue-600",
    warning: "bg-amber-500",
  };

  return (
    <div className="fixed bottom-24 inset-x-4 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type||"info"]} text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium animate-slide-up max-w-sm w-full text-center`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}


