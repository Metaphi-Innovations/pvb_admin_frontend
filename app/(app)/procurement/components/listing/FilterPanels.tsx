"use client";

import React from "react";
import { X } from "lucide-react";
import { FLabel, ProcInput, SearchableMultiSelect } from "../../design/proc-design";
import { ProcButton } from "../../design/proc-design";

const STATUS_OPTS = ["Draft", "Pending Approval", "Approved", "Rejected"];
const STATUS_MAP: Record<string, string> = {
  Draft: "draft",
  "Pending Approval": "pending_approval",
  Approved: "approved",
  Rejected: "rejected",
};
const STATUS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k]),
);

export function statusFilterToValues(labels: string[]): string[] {
  return labels.map((l) => STATUS_MAP[l]).filter(Boolean);
}

export function statusValuesToLabels(values: string[]): string[] {
  return values.map((v) => STATUS_REVERSE[v]).filter(Boolean);
}

export function FilterPanelPR({
  requestedByOptions,
  filters,
  onChange,
  onClearAll,
  activeCount,
}: {
  requestedByOptions: string[];
  filters: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  onClearAll: () => void;
  activeCount: number;
}) {
  return (
    <div className="border-b border-[#DDE3EF] px-4 py-3.5 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#0A1628]">Filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-600 text-white">{activeCount}</span>
          )}
        </div>
        {activeCount > 0 && (
          <button type="button" className="text-[12px] font-semibold text-brand-600" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <SearchableMultiSelect
          label="Status"
          placeholder="All Status"
          options={STATUS_OPTS}
          values={statusValuesToLabels(filters.status as string[])}
          onChange={(labels) => onChange("status", statusFilterToValues(labels))}
        />
        <SearchableMultiSelect
          label="Requested By"
          placeholder="All Requested By"
          options={requestedByOptions}
          values={(filters.requestedBy as string[]) ?? []}
          onChange={(v) => onChange("requestedBy", v)}
        />
        <div>
          <FLabel>Date From</FLabel>
          <ProcInput type="date" value={(filters.dateFrom as string) ?? ""} onChange={(e) => onChange("dateFrom", e.target.value)} />
        </div>
        <div>
          <FLabel>Date To</FLabel>
          <ProcInput type="date" value={(filters.dateTo as string) ?? ""} onChange={(e) => onChange("dateTo", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

const PO_STATUS_OPTS = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Invoice Uploaded",
  "Short Closed",
  "Closed",
  "Cancelled",
];
const PO_STATUS_MAP: Record<string, string> = {
  Draft: "draft",
  "Pending Approval": "pending_approval",
  Approved: "approved",
  Rejected: "rejected",
  "Invoice Uploaded": "invoice_uploaded",
  "Short Closed": "short_closed",
  Closed: "closed",
  Cancelled: "cancelled",
};
const PO_STATUS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(PO_STATUS_MAP).map(([k, v]) => [v, k]),
);

export function poStatusFilterToValues(labels: string[]): string[] {
  return labels.map((l) => PO_STATUS_MAP[l]).filter(Boolean);
}

export function poStatusValuesToLabels(values: string[]): string[] {
  return values.map((v) => PO_STATUS_REVERSE[v]).filter(Boolean);
}

export function FilterPanelPO({
  supplierOptions,
  prOptions,
  filters,
  onChange,
  onClearAll,
  activeCount,
}: {
  supplierOptions: string[];
  prOptions: string[];
  filters: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  onClearAll: () => void;
  activeCount: number;
}) {
  return (
    <div className="border-b border-[#DDE3EF] px-4 py-3.5 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#0A1628]">Filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-600 text-white">{activeCount}</span>
          )}
        </div>
        {activeCount > 0 && (
          <button type="button" className="text-[12px] font-semibold text-brand-600" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <SearchableMultiSelect
          label="Status"
          placeholder="All Status"
          options={PO_STATUS_OPTS}
          values={poStatusValuesToLabels(filters.status as string[])}
          onChange={(labels) => onChange("status", poStatusFilterToValues(labels))}
        />
        <SearchableMultiSelect
          label="Supplier"
          placeholder="All Supplier"
          options={supplierOptions}
          values={(filters.supplier as string[]) ?? []}
          onChange={(v) => onChange("supplier", v)}
        />
        <SearchableMultiSelect
          label="PR Reference"
          placeholder="All PR"
          options={prOptions}
          values={(filters.prReference as string[]) ?? []}
          onChange={(v) => onChange("prReference", v)}
        />
        <div>
          <FLabel>Date From</FLabel>
          <ProcInput type="date" value={(filters.dateFrom as string) ?? ""} onChange={(e) => onChange("dateFrom", e.target.value)} />
        </div>
        <div>
          <FLabel>Date To</FLabel>
          <ProcInput type="date" value={(filters.dateTo as string) ?? ""} onChange={(e) => onChange("dateTo", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export function ActiveFilterPills({
  pills,
  onRemove,
  onClearAll,
}: {
  pills: { key: string; label: string }[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  if (!pills.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#DDE3EF] bg-[#FAFBFE]">
      {pills.map((p) => (
        <span
          key={p.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200"
        >
          {p.label}
          <button type="button" onClick={() => onRemove(p.key)} className="hover:text-[#991B1B]">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <ProcButton variant="ghost" size="sm" className="text-[11px] h-7" onClick={onClearAll}>
        Clear all
      </ProcButton>
    </div>
  );
}
