"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";

export function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  colKey: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: string) => void;
  align?: "left" | "right" | "center";
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        active && "text-brand-700",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          <ChevronDown className={cn("w-3 h-3", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

const STATUS_MAP: Record<string, StatusKey> = {
  active: "active",
  inactive: "inactive",
  approved: "approved",
  posted: "approved",
  draft: "draft",
  rejected: "rejected",
  sent: "approved",
  cancelled: "rejected",
  paid: "approved",
  unpaid: "pending",
  partially_paid: "partial",
  no_debit: "draft",
  partially_debited: "partial",
  fully_debited: "closed",
  open: "pending",
  partial: "partial",
  closed: "closed",
  matched: "approved",
  unmatched: "pending",
  reconciled: "draft",
  pending: "pending",
};

export function StatusBadge({ status }: { status: string }) {
  const key = STATUS_MAP[status] ?? "inactive";
  const label = status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <SharedStatusBadge status={key} label={label} size="sm" />;
}

export function SectionTabs({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border/60 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px",
            active === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {counts && <span className="ml-1.5 opacity-70">{counts[t.id] ?? 0}</span>}
        </button>
      ))}
    </div>
  );
}
