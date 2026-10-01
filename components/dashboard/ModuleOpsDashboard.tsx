"use client";

import React, { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashPanel } from "@/components/dashboard/DashPrimitives";
import {
  ComponentPeriodSelect,
  ModuleSummaryStrip,
  useComponentPeriod,
} from "@/components/dashboard/DashboardShared";
import { useDashboardFilters } from "@/components/dashboard/DashboardFilterContext";
import { periodActivityScale } from "@/components/dashboard/dashboard-period";
import type { DashboardTabId, SummaryKpi, WorkspaceRow } from "@/components/dashboard/mock-data";

type ColKey = "type" | "docNo" | "party" | "warehouse" | "owner" | "amount" | "status" | "days" | "reason" | "date";

function ExcelValueFilter({
  label,
  options,
  selected,
  isSorted,
  align = "left",
  onApply,
  onSort,
  onClear,
}: {
  label: string;
  options: string[];
  selected: Set<string> | null;
  isSorted: boolean;
  align?: "left" | "right";
  onApply: (v: Set<string> | null) => void;
  onSort: (dir: "asc" | "desc") => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const isActive = selected != null && selected.size > 0 && selected.size < options.length;
  const filteredOpts = useMemo(() => {
    const list = [...options].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((v) => v.toLowerCase().includes(needle));
  }, [options, q]);

  return (
    <div className={cn("flex items-center gap-0.5", align === "right" && "justify-end")}>
      <span className={cn("text-xs font-semibold", isSorted ? "text-brand-700" : "text-foreground")}>{label}</span>
      <div className="relative">
        <button
          type="button"
          className={cn(
            "p-0.5 rounded hover:bg-muted",
            isActive || isSorted ? "text-brand-600" : "text-muted-foreground/50",
          )}
          onClick={() => {
            setQ("");
            setDraft(selected ? new Set(selected) : new Set(options));
            setOpen((o) => !o);
          }}
        >
          <Filter className="w-3 h-3" />
        </button>
        {open && (
          <div className="absolute z-30 top-6 left-0 w-56 rounded-xl border border-border bg-white shadow-lg p-0">
            <div className="px-2.5 py-2 border-b border-border space-y-1.5">
              <div className="flex gap-1">
                <button type="button" className="flex-1 h-7 text-[11px] border rounded-md hover:bg-muted inline-flex items-center justify-center gap-1" onClick={() => { onSort("asc"); setOpen(false); }}>
                  <ArrowUpAZ className="w-3 h-3" /> Asc
                </button>
                <button type="button" className="flex-1 h-7 text-[11px] border rounded-md hover:bg-muted inline-flex items-center justify-center gap-1" onClick={() => { onSort("desc"); setOpen(false); }}>
                  <ArrowDownAZ className="w-3 h-3" /> Desc
                </button>
              </div>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-[7px] text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full h-7 pl-7 pr-2 text-xs border rounded-md" />
              </div>
            </div>
            <div className="px-2.5 py-1.5 border-b">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-brand-600"
                  checked={filteredOpts.length > 0 && filteredOpts.every((v) => draft.has(v))}
                  onChange={() => {
                    const next = new Set(draft);
                    const all = filteredOpts.every((v) => draft.has(v));
                    filteredOpts.forEach((v) => (all ? next.delete(v) : next.add(v)));
                    setDraft(next);
                  }}
                />
                Select All
              </label>
            </div>
            <div className="max-h-36 overflow-y-auto px-2.5 py-1.5 space-y-1">
              {filteredOpts.map((v) => (
                <label key={v} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={draft.has(v)}
                    onChange={() => {
                      const next = new Set(draft);
                      next.has(v) ? next.delete(v) : next.add(v);
                      setDraft(next);
                    }}
                  />
                  <span className="truncate">{v}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center px-2.5 py-2 border-t bg-muted/20">
              <button type="button" className="text-[11px] text-brand-600" onClick={() => { onClear(); setOpen(false); }}>Clear Filter</button>
              <button
                type="button"
                className="ml-auto h-7 px-2.5 text-[11px] rounded-md bg-brand-600 text-white"
                onClick={() => {
                  if (draft.size === 0 || draft.size === options.length) onApply(null);
                  else onApply(new Set(draft));
                  setOpen(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function cell(row: WorkspaceRow, key: ColKey): string {
  switch (key) {
    case "type": return row.type;
    case "docNo": return row.docNo;
    case "party": return row.party;
    case "warehouse": return row.warehouse;
    case "owner": return row.owner;
    case "amount": return row.amount;
    case "status": return row.status;
    case "days": return row.daysPending ? String(row.daysPending) : "—";
    case "reason": return row.reason;
    case "date": return row.date;
  }
}

export function ModuleOpsDashboard({
  moduleId,
  workspaceTitle,
  supportLeft,
  supportRight,
  fullWidth,
}: {
  moduleId: Exclude<DashboardTabId, "overview">;
  workspaceTitle: string;
  supportLeft?: React.ReactNode;
  supportRight?: React.ReactNode;
  fullWidth?: React.ReactNode;
}) {
  const { data, filters } = useDashboardFilters();
  const period = useComponentPeriod("this_month");
  const summary = data.moduleSummaries[moduleId];
  const rows = data.workspaces[moduleId];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [colFilters, setColFilters] = useState<Partial<Record<ColKey, Set<string> | null>>>({});
  const [sort, setSort] = useState<{ key: ColKey; dir: "asc" | "desc" }>({ key: "days", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const types = useMemo(() => ["all", ...new Set(rows.map((r) => r.type))], [rows]);
  const statuses = useMemo(() => ["all", ...new Set(rows.map((r) => r.status))], [rows]);

  const scale = periodActivityScale(period.fromDate, period.toDate);

  const filtered = useMemo(() => {
    let list = rows;
    if (filters.warehouseId !== "All Warehouses") {
      list = list.filter((r) => r.warehouse === filters.warehouse);
    }
    if (typeFilter !== "all") list = list.filter((r) => r.type === typeFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (kpiFilter) {
      const q = kpiFilter.toLowerCase();
      list = list.filter((r) => r.status.toLowerCase().includes(q.replace(/_/g, " ")) || r.type.toLowerCase().includes(q));
    }
    const kw = search.trim().toLowerCase();
    if (kw) list = list.filter((r) => `${r.docNo} ${r.party} ${r.owner} ${r.status}`.toLowerCase().includes(kw));
    (Object.keys(colFilters) as ColKey[]).forEach((k) => {
      const sel = colFilters[k];
      if (sel && sel.size) list = list.filter((r) => sel.has(cell(r, k)));
    });
    // light period scale — keep all rows but order by urgency for longer periods
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "days") cmp = a.daysPending - b.daysPending;
      else if (sort.key === "amount") cmp = a.amountNumeric - b.amountNumeric;
      else cmp = cell(a, sort.key).localeCompare(cell(b, sort.key), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
    if (scale > 2) list = list.filter((_, i) => i % 1 === 0);
    return list;
  }, [rows, filters, typeFilter, statusFilter, kpiFilter, search, colFilters, sort, scale]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const colOptions = useMemo(() => {
    const keys: ColKey[] = ["type", "docNo", "party", "warehouse", "owner", "amount", "status", "days", "reason", "date"];
    const map = {} as Record<ColKey, string[]>;
    keys.forEach((k) => {
      map[k] = [...new Set(filtered.map((r) => cell(r, k)))];
    });
    return map;
  }, [filtered]);

  const th = (label: string, key: ColKey, align: "left" | "right" = "left") => (
    <th className={cn("px-2.5 py-2 sticky top-0 z-10 bg-muted border-b border-border", align === "right" ? "text-right" : "text-left")}>
      <ExcelValueFilter
        label={label}
        options={colOptions[key] ?? []}
        selected={colFilters[key] ?? null}
        isSorted={sort.key === key}
        align={align}
        onApply={(v) => { setColFilters((p) => ({ ...p, [key]: v })); setPage(1); }}
        onSort={(dir) => { setSort({ key, dir }); setPage(1); }}
        onClear={() => { setColFilters((p) => { const n = { ...p }; delete n[key]; return n; }); setPage(1); }}
      />
    </th>
  );

  return (
    <div className="space-y-3">
      <ModuleSummaryStrip
        items={summary}
        activeKey={kpiFilter}
        onSelect={(key) => {
          setKpiFilter((c) => (c === key ? null : key));
          setPage(1);
        }}
      />

      <DashPanel
        title={workspaceTitle}
        subtitle="Search · type · status · Excel column filters"
        className="min-h-[min(58vh,640px)] flex flex-col shadow-card"
        bodyClassName="p-2.5 space-y-2 flex-1 flex flex-col min-h-0"
        action={
          <ComponentPeriodSelect
            preset={period.preset}
            fromDate={period.fromDate}
            toDate={period.toDate}
            onPreset={period.applyPreset}
            onFrom={period.setFromDate}
            onTo={period.setToDate}
            onApplyCustom={period.applyCustom}
          />
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[8px] text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search…"
              className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-border"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={cn(
                  "h-7 px-2.5 text-xs rounded-lg border font-medium",
                  typeFilter === t ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t === "all" ? "All Types" : t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                "h-7 px-2.5 text-xs rounded-lg border font-medium",
                statusFilter === s ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>

        {kpiFilter && (
          <button
            type="button"
            onClick={() => setKpiFilter(null)}
            className="inline-flex items-center gap-1 h-6 px-1.5 text-[10px] font-medium rounded-md bg-brand-50 border border-brand-200 text-brand-700 w-fit"
          >
            Summary: {kpiFilter} <X className="w-2.5 h-2.5" />
          </button>
        )}

        <div className="flex-1 min-h-[280px] overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[960px] border-separate border-spacing-0">
            <thead>
              <tr>
                {th("Type", "type")}
                {th("Doc No", "docNo")}
                {th("Party", "party")}
                {th("Warehouse", "warehouse")}
                {th("Owner", "owner")}
                {th("Amount / Qty", "amount", "right")}
                {th("Status", "status")}
                {th("Days", "days", "right")}
                {th("Reason", "reason")}
                {th("Date", "date")}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-xs text-muted-foreground">No records match filters.</td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-2.5 py-1.5 text-xs">{r.type}</td>
                    <td className="px-2.5 py-1.5 text-xs font-mono font-semibold text-brand-700">{r.docNo}</td>
                    <td className="px-2.5 py-1.5 text-xs max-w-[140px] truncate">{r.party}</td>
                    <td className="px-2.5 py-1.5 text-xs truncate">{r.warehouse}</td>
                    <td className="px-2.5 py-1.5 text-xs truncate">{r.owner}</td>
                    <td className="px-2.5 py-1.5 text-xs text-right tabular-nums font-semibold">{r.amount}</td>
                    <td className="px-2.5 py-1.5 text-xs">
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-muted/60 text-muted-foreground">{r.status}</span>
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-right tabular-nums">{r.daysPending || "—"}</td>
                    <td className="px-2.5 py-1.5 text-xs text-muted-foreground truncate max-w-[120px]">{r.reason}</td>
                    <td className="px-2.5 py-1.5 text-xs text-muted-foreground">{r.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            Showing <span className="font-medium text-foreground">{pageRows.length}</span> of{" "}
            <span className="font-medium text-foreground">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 px-2 text-xs border rounded-lg disabled:opacity-50">Prev</button>
            <span className="text-[11px] text-muted-foreground tabular-nums">{safePage}/{totalPages}</span>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 px-2 text-xs border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      </DashPanel>

      {(supportLeft || supportRight) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          {supportLeft}
          {supportRight}
        </div>
      )}
      {fullWidth}
    </div>
  );
}

export function SupportListPanel({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: { label: string; value: string | number; hint?: string }[];
}) {
  return (
    <DashPanel title={title} subtitle={subtitle} className="shadow-sm" bodyClassName="p-0">
      <ul className="divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{r.label}</p>
              {r.hint && <p className="text-[11px] text-muted-foreground">{r.hint}</p>}
            </div>
            <span className="text-xs font-bold tabular-nums text-brand-700">{r.value}</span>
          </li>
        ))}
      </ul>
    </DashPanel>
  );
}
