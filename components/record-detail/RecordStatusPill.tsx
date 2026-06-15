"use client";

import { cn } from "@/lib/utils";

export function RecordStatusPill({
  label,
  variant = "active",
}: {
  label: string;
  variant?: "active" | "inactive" | "draft" | "blocked" | "neutral";
}) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    inactive: "bg-slate-100 text-slate-600 border-slate-200/60",
    draft: "bg-blue-50 text-blue-700 border-blue-200/60",
    blocked: "bg-red-50 text-red-700 border-red-200/60",
    neutral: "bg-slate-50 text-slate-600 border-slate-200/60",
  }[variant];

  const dot = {
    active: "bg-emerald-500",
    inactive: "bg-slate-400",
    draft: "bg-blue-500",
    blocked: "bg-red-400",
    neutral: "bg-slate-400",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        styles,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
