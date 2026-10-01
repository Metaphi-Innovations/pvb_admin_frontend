"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LeaveRequestStatus, ReimbursementRequestStatus } from "../requests-data";

export function RequestModeTabs({
  mode,
  onChange,
  pendingCount,
  historyCount,
}: {
  mode: "pending" | "history";
  onChange: (m: "pending" | "history") => void;
  pendingCount: number;
  historyCount: number;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-0.5 rounded-lg border border-border bg-muted/30">
      {(
        [
          { id: "pending" as const, label: "Pending", count: pendingCount },
          { id: "history" as const, label: "History", count: historyCount },
        ] as const
      ).map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "h-7 px-3 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5",
            mode === t.id
              ? "bg-white text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          <span
            className={cn(
              "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center",
              mode === t.id ? "bg-brand-50 text-brand-700" : "bg-muted text-muted-foreground",
            )}
          >
            {t.count}
          </span>
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

export function RequestStatusChip({
  status,
}: {
  status: LeaveRequestStatus | ReimbursementRequestStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize",
        STATUS_STYLE[status] ?? STATUS_STYLE.cancelled,
      )}
    >
      {status}
    </span>
  );
}

export function IconActionBtn({
  label,
  onClick,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "neutral" | "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
            tone === "success" && "text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50",
            tone === "danger" && "text-muted-foreground hover:text-red-600 hover:bg-red-50",
            tone === "neutral" && "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 px-2.5 text-xs rounded-lg border border-border bg-white text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-brand-300/50 focus:border-brand-400",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground mt-0.5 break-words">{value || "—"}</p>
    </div>
  );
}
