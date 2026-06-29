"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, X, ChevronDown, ChevronsUpDown } from "lucide-react";

export function StatusPill({
  status,
  config,
}: {
  status: string;
  config: Record<string, { bg: string; text: string; dot: string; label: string }>;
}) {
  const cfg = config[status] ?? Object.values(config)[0];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  colKey: string;
  sortKey: string;
  sortDir: string;
  onSort: (k: string) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
      </div>
    </th>
  );
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-border pb-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap",
            active === t.id
              ? "border-brand-600 text-brand-700 bg-brand-50/50"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
        >
          {t.label}
          {counts?.[t.id] != null && (
            <span
              className={cn(
                "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                active === t.id ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {counts[t.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Toast({
  toast,
  onDismiss,
  autoHideMs = 2500,
}: {
  toast: { msg: string; type: "success" | "error" };
  onDismiss: () => void;
  autoHideMs?: number;
}) {
  React.useEffect(() => {
    if (autoHideMs <= 0) return;
    const t = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(t);
  }, [toast.msg, autoHideMs, onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
      role="status"
      aria-live="polite"
    >
        {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
        <span className="flex-1">{toast.msg}</span>
      <button type="button" onClick={onDismiss} className="opacity-80 hover:opacity-100 shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export type { ActivityEntry } from "@/lib/procurement/types";
import type { ActivityEntry } from "@/lib/procurement/types";

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="space-y-0">
      {entries.map((e, i) => (
        <div key={`${e.date}-${e.action}-${i}`} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
            {i < entries.length - 1 && <div className="w-px flex-1 bg-border min-h-[24px] mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{e.action}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {e.by} · {e.date}
            </p>
            {e.note && <p className="text-[11px] text-muted-foreground mt-1">{e.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApprovalHistoryPanel({
  enabled,
  status,
  approvedBy,
  approvedDate,
}: {
  enabled: boolean;
  status: string;
  approvedBy?: string;
  approvedDate?: string;
}) {
  if (!enabled) {
    return (
      <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2">
        Approval workflow is disabled — documents are auto-approved on submit.
      </p>
    );
  }
  return (
    <div className="border border-border rounded-xl p-4 bg-white space-y-2">
      <p className="text-xs font-semibold text-foreground">Approval workflow</p>
      <p className="text-[11px] text-muted-foreground">Sequential role-based approvers (configured in Roles master).</p>
      {approvedBy && (
        <p className="text-xs text-emerald-700 font-medium">
          Approved by {approvedBy} on {approvedDate}
        </p>
      )}
      {status === "pending_approval" && (
        <p className="text-xs text-amber-700 font-medium">Awaiting approver action</p>
      )}
      {status === "rejected" && <p className="text-xs text-red-700 font-medium">Rejected — see activity timeline</p>}
    </div>
  );
}
