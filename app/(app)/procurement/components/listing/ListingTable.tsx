"use client";

import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDir } from "../../hooks/useListingFilters";

export function SortableTh({
  label,
  colKey,
  sortCol,
  sortDir,
  onSort,
  hasFilter,
  className,
}: {
  label: string;
  colKey: string;
  sortCol: string;
  sortDir: SortDir;
  onSort: (k: string) => void;
  hasFilter?: boolean;
  className?: string;
}) {
  const active = sortCol === colKey;
  return (
    <th
      className={cn(
        "px-3 h-11 text-left text-[11px] font-bold uppercase tracking-wide text-[#9AAAC5] cursor-pointer select-none whitespace-nowrap",
        className,
      )}
      style={{ backgroundColor: "#F7F9FC" }}
      onClick={() => onSort(colKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {hasFilter && <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3 h-3 text-brand-700" />
          ) : (
            <ArrowDown className="w-3 h-3 text-brand-700" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-[#9AAAC5] opacity-50" />
        )}
      </span>
    </th>
  );
}

export function ListingTableShell({
  toolbar,
  filterPanel,
  filterPills,
  countLabel,
  children,
}: {
  toolbar: React.ReactNode;
  filterPanel?: React.ReactNode;
  filterPills?: React.ReactNode;
  countLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[#DDE3EF] bg-white shadow-[0_1px_3px_rgba(10,22,40,0.06)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#DDE3EF] flex flex-wrap items-center gap-3 justify-between">
        {toolbar}
        {countLabel && <p className="text-[11px] text-[#6B80A0] font-medium ml-auto">{countLabel}</p>}
      </div>
      {filterPanel}
      {filterPills}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function ListingEmpty({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 px-4 text-center">
      <div className="flex justify-center mb-3 text-[#6B80A0]">{icon}</div>
      <p className="text-[13px] font-semibold text-[#0A1628]">{title}</p>
      {subtitle && <p className="text-[12px] text-[#6B80A0] mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
