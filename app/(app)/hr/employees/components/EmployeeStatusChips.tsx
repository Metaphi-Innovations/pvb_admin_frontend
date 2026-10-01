"use client";

import { cn } from "@/lib/utils";
import type { EmployeeRecordStatus, EmploymentStatus } from "../employee-master-data";
import { getEmploymentStatusLabel, getRecordStatusLabel } from "../employee-display";

const EMPLOYMENT_STYLES: Record<EmploymentStatus, { bg: string; text: string; border: string; dot: string }> = {
  active: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  probation: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-400",
  },
  notice: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-400",
  },
  resigned: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  terminated: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-400",
  },
};

const RECORD_STYLES: Record<EmployeeRecordStatus, { bg: string; text: string; border: string; dot: string }> = {
  active: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  inactive: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

export function EmploymentStatusChip({ status }: { status: EmploymentStatus }) {
  const s = EMPLOYMENT_STYLES[status] ?? EMPLOYMENT_STYLES.active;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        s.bg,
        s.text,
        s.border,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} aria-hidden />
      {getEmploymentStatusLabel(status)}
    </span>
  );
}

export function RecordStatusChip({ status }: { status: EmployeeRecordStatus }) {
  const s = RECORD_STYLES[status] ?? RECORD_STYLES.inactive;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        s.bg,
        s.text,
        s.border,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} aria-hidden />
      {getRecordStatusLabel(status)}
    </span>
  );
}

export function EmployeeAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const sizeCls =
    size === "sm" ? "w-8 h-8 text-[10px]" : size === "lg" ? "w-14 h-14 text-base" : "w-9 h-9 text-xs";

  return (
    <div
      className={cn(
        "rounded-full bg-brand-50 border border-brand-100 text-brand-700 font-semibold flex items-center justify-center shrink-0",
        sizeCls,
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function ProfileCompletionCell({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[72px]" title={`Profile ${percent}% complete`}>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[56px]">
        <div
          className={cn(
            "h-full rounded-full",
            percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-brand-500" : "bg-amber-400",
          )}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-foreground tabular-nums w-8">{percent}%</span>
    </div>
  );
}
