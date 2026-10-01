"use client";

import React, { useMemo, useState } from "react";
import {
  Search, SlidersHorizontal, Columns, ArrowDownToLine, Upload, ChevronDown, ChevronsUpDown,
  MoreVertical, Eye, Edit2, Trash2, CheckCircle2, XCircle, Archive, ChevronRight,
  FileX, ServerCrash, RefreshCw, RotateCcw, Plus, Filter, Rows3, LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SectionShell, SectionBlock, PreviewFrame, DoDont, BestPractices, TokenUsage,
  AccessibilityNotes, ProductionNotes, ErpUseCase,
} from "../_components/SectionShell";
import { TplTabs, TplTabsList, TplTabsTrigger, TplTabsContent } from "../_components/TemplateTabs";
import {
  MOCK_EMPLOYEES, MOCK_LEAVE_REQUESTS, MOCK_ATTENDANCE, MOCK_PAYROLL,
  MOCK_CANDIDATES, MOCK_ASSETS, initials,
} from "../mock/hrms-data";

const MOCK_SALARY_REVISION = [
  { id: "SR-101", employee: "Priya Sharma", effective: "2026-04-01", oldCtc: "₹9.2L", newCtc: "₹10.1L", pct: "+9.8%", status: "approved" },
  { id: "SR-102", employee: "Rahul Mehta", effective: "2026-07-01", oldCtc: "₹7.8L", newCtc: "₹8.4L", pct: "+7.7%", status: "pending" },
  { id: "SR-103", employee: "Neha Gupta", effective: "2026-08-01", oldCtc: "₹14.5L", newCtc: "₹15.2L", pct: "+4.8%", status: "draft" },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  probation: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  notice: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  "on-leave": { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  present: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  late: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  absent: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  "half-day": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  processed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  "in-progress": { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  assigned: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  available: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  "offer-sent": { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  joined: { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status.toLowerCase()] ?? STATUS_CFG.draft;
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, " ");
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {label}
    </span>
  );
}

function RowMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 w-40 rounded-[10px] border border-border bg-white shadow-lg py-1 text-xs">
            {[{ i: Eye, l: "View" }, { i: Edit2, l: "Edit" }, { i: CheckCircle2, l: "Approve" }].map(({ i: Icon, l }) => (
              <button key={l} className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/60 text-left" onClick={() => setOpen(false)}>
                <Icon className="w-3.5 h-3.5" />{l}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-50 text-red-600 text-left" onClick={() => setOpen(false)}>
              <Trash2 className="w-3.5 h-3.5" />Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type Col = { key: string; label: string; sortable?: boolean; filterable?: boolean; pin?: boolean; render?: (v: unknown, r: Record<string, unknown>) => React.ReactNode };
type GridState = "data" | "loading" | "empty" | "no-results" | "error";
type Density = "compact" | "comfortable";

const DATASETS: Record<string, { label: string; data: Record<string, unknown>[]; cols: Col[]; expandable?: boolean; footerLabel?: string; footerValue?: string }> = {
  employees: {
    label: "Employee Directory",
    data: MOCK_EMPLOYEES as unknown as Record<string, unknown>[],
    expandable: true,
    footerLabel: "Total employees",
    footerValue: String(MOCK_EMPLOYEES.length),
    cols: [
      { key: "code", label: "Code", pin: true, render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{String(v)}</span> },
      { key: "name", label: "Name", pin: true, render: (v) => (
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">{initials(String(v))}</span>
          <span className="text-xs font-semibold">{String(v)}</span>
        </span>
      )},
      { key: "department", label: "Department", filterable: true },
      { key: "designation", label: "Designation" },
      { key: "branch", label: "Branch", filterable: true },
      { key: "status", label: "Status", filterable: true, render: (v) => <StatusPill status={String(v)} /> },
    ],
  },
  attendance: {
    label: "Attendance Register",
    data: MOCK_ATTENDANCE as unknown as Record<string, unknown>[],
    footerLabel: "Avg hours",
    footerValue: "5.3h",
    cols: [
      { key: "date", label: "Date", pin: true },
      { key: "emp", label: "Employee", pin: true },
      { key: "in", label: "In" }, { key: "out", label: "Out" },
      { key: "hours", label: "Hours" },
      { key: "status", label: "Status", filterable: true, render: (v) => <StatusPill status={String(v)} /> },
    ],
  },
  leave: {
    label: "Leave Requests",
    data: MOCK_LEAVE_REQUESTS as unknown as Record<string, unknown>[],
    footerLabel: "Pending approval",
    footerValue: "2",
    cols: [
      { key: "id", label: "Request ID", pin: true, render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{String(v)}</span> },
      { key: "employee", label: "Employee", pin: true },
      { key: "type", label: "Type", filterable: true }, { key: "from", label: "From" }, { key: "to", label: "To" }, { key: "days", label: "Days" },
      { key: "status", label: "Status", filterable: true, render: (v) => <StatusPill status={String(v)} /> },
    ],
  },
  payroll: {
    label: "Payroll Processing",
    data: MOCK_PAYROLL as unknown as Record<string, unknown>[],
    footerLabel: "Latest net payout",
    footerValue: "₹1.54 Cr",
    cols: [
      { key: "cycle", label: "Cycle", pin: true },
      { key: "employees", label: "Employees" },
      { key: "gross", label: "Gross" }, { key: "net", label: "Net" },
      { key: "status", label: "Status", filterable: true, render: (v) => <StatusPill status={String(v)} /> },
      { key: "paidOn", label: "Paid on" },
    ],
  },
  revision: {
    label: "Salary Revision",
    data: MOCK_SALARY_REVISION as unknown as Record<string, unknown>[],
    footerLabel: "Avg hike",
    footerValue: "+7.4%",
    cols: [
      { key: "id", label: "Revision ID", pin: true, render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{String(v)}</span> },
      { key: "employee", label: "Employee", pin: true },
      { key: "effective", label: "Effective" }, { key: "oldCtc", label: "Old CTC" }, { key: "newCtc", label: "New CTC" }, { key: "pct", label: "Change" },
      { key: "status", label: "Status", filterable: true, render: (v) => <StatusPill status={String(v)} /> },
    ],
  },
  assets: {
    label: "Asset Assignment",
    data: MOCK_ASSETS as unknown as Record<string, unknown>[],
    footerLabel: "Assigned",
    footerValue: "3 / 4",
    cols: [
      { key: "id", label: "Asset ID", pin: true, render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{String(v)}</span> },
      { key: "type", label: "Type", pin: true, filterable: true },
      { key: "tag", label: "Tag" }, { key: "assignedTo", label: "Assigned to" }, { key: "issued", label: "Issued" },
      { key: "status", label: "Status", filterable: true, render: (v) => <StatusPill status={String(v)} /> },
    ],
  },
  candidates: {
    label: "Recruitment",
    data: MOCK_CANDIDATES as unknown as Record<string, unknown>[],
    footerLabel: "Active pipeline",
    footerValue: "3",
    cols: [
      { key: "id", label: "Candidate ID", pin: true, render: (v) => <span className="font-mono text-xs font-semibold text-brand-700">{String(v)}</span> },
      { key: "name", label: "Name", pin: true },
      { key: "role", label: "Role", filterable: true }, { key: "stage", label: "Stage", filterable: true },
      { key: "source", label: "Source" }, { key: "rating", label: "Rating" },
      { key: "status", label: "Status", filterable: true, render: (v) => <StatusPill status={String(v)} /> },
    ],
  },
};

function DataGrid({ dsKey, stateOverride }: { dsKey: string; stateOverride?: GridState }) {
  const ds = DATASETS[dsKey];
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [density, setDensity] = useState<Density>("compact");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [filterCol, setFilterCol] = useState<string | null>(null);
  const [showCols, setShowCols] = useState(false);
  const PER = 5;
  const py = density === "compact" ? "py-2" : "py-2.5";
  const visibleCols = ds.cols.filter((c) => !hiddenCols.has(c.key));

  const filtered = useMemo(() => {
    let rows = ds.data;
    if (search.trim()) rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase())));
    Object.entries(colFilters).forEach(([k, v]) => { if (v) rows = rows.filter((r) => String(r[k]).toLowerCase().includes(v.toLowerCase())); });
    return rows;
  }, [ds.data, search, colFilters]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? c : -c;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER));
  const paged = sorted.slice((page - 1) * PER, page * PER);
  const effective: GridState = stateOverride ?? (search.trim() && !filtered.length ? "no-results" : "data");

  const toggleSort = (k: string) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "asc" ? "desc" : "asc"); };
  const toggleAll = () => setSelected(selected.size === paged.length ? new Set() : new Set(paged.map((_, i) => i)));
  const colSpan = visibleCols.length + (ds.expandable ? 3 : 2);

  return (
    <div className="space-y-2.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search grid…"
            className="pl-8 pr-3 h-8 text-xs border border-border rounded-[10px] w-40 focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="h-8 px-2.5 text-xs border border-border rounded-[10px] hover:bg-muted inline-flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Import</button>
          <button className="h-8 px-2.5 text-xs border border-border rounded-[10px] hover:bg-muted inline-flex items-center gap-1.5"><ArrowDownToLine className="w-3.5 h-3.5" />Export</button>
          <div className="relative">
            <button onClick={() => setShowCols(!showCols)} className="h-8 px-2.5 text-xs border border-border rounded-[10px] hover:bg-muted inline-flex items-center gap-1.5">
              <Columns className="w-3.5 h-3.5" />Columns
            </button>
            {showCols && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCols(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-[10px] border border-border bg-white shadow-lg p-2 space-y-1">
                  {ds.cols.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 px-1.5 py-1 text-xs cursor-pointer hover:bg-muted/40 rounded-md">
                      <input type="checkbox" className="accent-brand-600" checked={!hiddenCols.has(c.key)}
                        onChange={() => setHiddenCols((p) => { const n = new Set(p); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="inline-flex border border-border rounded-[10px] overflow-hidden">
            {(["compact", "comfortable"] as Density[]).map((d) => (
              <button key={d} onClick={() => setDensity(d)} className={cn("h-8 px-2.5 text-xs inline-flex items-center gap-1", density === d ? "bg-brand-50 text-brand-700" : "hover:bg-muted")}>
                {d === "compact" ? <Rows3 className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                {d === "compact" ? "Compact" : "Comfort"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="rounded-[10px] border border-brand-200 bg-brand-50 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-brand-700">{selected.size} selected</span>
          <div className="flex flex-wrap gap-1.5">
            <button className="h-7 px-2.5 text-xs bg-emerald-600 text-white rounded-[8px] inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Approve</button>
            <button className="h-7 px-2.5 text-xs bg-red-600 text-white rounded-[8px] inline-flex items-center gap-1"><XCircle className="w-3 h-3" />Reject</button>
            <button className="h-7 px-2.5 text-xs border border-border rounded-[8px] inline-flex items-center gap-1"><Archive className="w-3 h-3" />Archive</button>
            <button onClick={() => setSelected(new Set())} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">Clear</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[320px] overflow-y-auto relative">
          <table className="w-full min-w-[640px]">
            <thead className="sticky top-0 z-20 bg-muted/40 border-b border-border">
              <tr>
                <th className={cn("w-10 px-3 sticky left-0 z-30 bg-muted/40", py)}>
                  <input type="checkbox" className="accent-brand-600 w-4 h-4" checked={!!paged.length && selected.size === paged.length} onChange={toggleAll} />
                </th>
                {ds.expandable && <th className={cn("w-8 px-1", py)} />}
                {visibleCols.map((col, ci) => (
                  <th key={col.key} className={cn("px-3 text-left text-xs font-semibold whitespace-nowrap select-none group", py,
                    sortKey === col.key && "bg-brand-50/60", col.pin && "sticky z-30 bg-muted/40", col.pin && ci === 0 && "left-10")}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => col.sortable !== false && toggleSort(col.key)} className="flex items-center gap-1 hover:text-brand-700">
                        <span className={sortKey === col.key ? "text-brand-700" : "text-foreground"}>{col.label}</span>
                        {col.sortable !== false && (sortKey === col.key
                          ? <ChevronDown className={cn("w-3 h-3 text-brand-600", sortDir === "desc" && "rotate-180")} />
                          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40" />)}
                      </button>
                      {col.filterable && (
                        <div className="relative">
                          <button onClick={() => setFilterCol(filterCol === col.key ? null : col.key)} className={cn("p-0.5 rounded hover:bg-muted", colFilters[col.key] && "text-brand-600")}>
                            <Filter className="w-3 h-3" />
                          </button>
                          {filterCol === col.key && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setFilterCol(null)} />
                              <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-[8px] border border-border bg-white shadow-lg p-2">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Filter</p>
                                <input value={colFilters[col.key] ?? ""} onChange={(e) => { setColFilters({ ...colFilters, [col.key]: e.target.value }); setPage(1); }}
                                  placeholder="Contains…" className="w-full h-7 px-2 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-300" />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className={cn("w-10 px-2", py)} />
              </tr>
            </thead>
            <tbody>
              {effective === "loading" && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60">{Array.from({ length: colSpan }).map((__, j) => (
                  <td key={j} className={cn("px-3", py)}><div className="h-3 bg-muted animate-pulse rounded w-20" /></td>
                ))}</tr>
              ))}
              {effective === "empty" && (
                <tr><td colSpan={colSpan} className="py-12 text-center">
                  <FileX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No records yet</p>
                  <button className="mt-2 h-8 px-3 text-xs bg-brand-600 text-white rounded-[10px] inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Add</button>
                </td></tr>
              )}
              {effective === "no-results" && (
                <tr><td colSpan={colSpan} className="py-12 text-center">
                  <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No results</p>
                  <button onClick={() => setSearch("")} className="mt-2 h-8 px-3 text-xs border border-border rounded-[10px] inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Clear</button>
                </td></tr>
              )}
              {effective === "error" && (
                <tr><td colSpan={colSpan} className="py-12 text-center">
                  <ServerCrash className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Failed to load</p>
                  <button className="mt-2 h-8 px-3 text-xs border border-border rounded-[10px] inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Retry</button>
                </td></tr>
              )}
              {effective === "data" && paged.map((row, idx) => (
                <React.Fragment key={idx}>
                  <tr className={cn("border-b border-border/60 hover:bg-muted/20 transition-colors group", selected.has(idx) && "bg-brand-50/60")}>
                    <td className={cn("px-3 sticky left-0 z-10 bg-white group-hover:bg-muted/20", selected.has(idx) && "bg-brand-50/60", py)}>
                      <input type="checkbox" className="accent-brand-600 w-4 h-4" checked={selected.has(idx)} onChange={() => setSelected((p) => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })} />
                    </td>
                    {ds.expandable && (
                      <td className={cn("px-1", py)}>
                        <button onClick={() => setExpanded((p) => { const n = new Set(p); n.has(idx) ? n.delete(idx) : n.add(idx); return n; })} className="p-0.5 hover:bg-muted rounded">
                          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expanded.has(idx) && "rotate-90")} />
                        </button>
                      </td>
                    )}
                    {visibleCols.map((col, ci) => (
                      <td key={col.key} className={cn("px-3 text-xs text-foreground whitespace-nowrap", py,
                        col.pin && "sticky z-10 bg-white group-hover:bg-muted/20", col.pin && ci === 0 && "left-10", selected.has(idx) && col.pin && "bg-brand-50/60")}>
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    <td className={cn("px-2 text-right", py)}><RowMenu /></td>
                  </tr>
                  {ds.expandable && expanded.has(idx) && (
                    <tr className="bg-muted/10 border-b border-border/60">
                      <td colSpan={colSpan} className="px-4 py-2.5">
                        <div className="grid grid-cols-3 gap-3 text-[11px]">
                          <div><span className="text-muted-foreground">Email</span><p className="font-medium">{String(row.email ?? "—")}</p></div>
                          <div><span className="text-muted-foreground">Manager</span><p className="font-medium">{String(row.manager ?? "—")}</p></div>
                          <div><span className="text-muted-foreground">Profile</span><p className="font-medium">{String(row.profilePct ?? "—")}% complete</p></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 bg-muted/30 border-t border-border">
              <tr>
                <td colSpan={colSpan} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{paged.length}</span> of <span className="font-medium text-foreground">{sorted.length}</span>
                      {ds.footerLabel && <> · {ds.footerLabel}: <span className="font-semibold text-foreground">{ds.footerValue}</span></>}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-7 px-2 text-xs border border-border rounded-[8px] disabled:opacity-40">Prev</button>
                      <span className="text-[11px] text-muted-foreground">{page}/{totalPages}</span>
                      <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-7 px-2 text-xs border border-border rounded-[8px] disabled:opacity-40">Next</button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdvancedResizeEditableDemo() {
  const [widths, setWidths] = useState({ emp: 160, in: 88, out: 88, note: 180 });
  const [rows, setRows] = useState(
    MOCK_ATTENDANCE.slice(0, 4).map((r) => ({ ...r, note: "" })),
  );
  const startResize = (key: keyof typeof widths, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widths[key];
    const onMove = (ev: MouseEvent) => {
      setWidths((w) => ({ ...w, [key]: Math.max(72, startW + (ev.clientX - startX)) }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  return (
    <div className="rounded-[12px] border border-border overflow-hidden">
      <table className="w-full text-xs table-fixed">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            {([
              ["emp", "Employee"],
              ["in", "In"],
              ["out", "Out"],
              ["note", "Editable note"],
            ] as const).map(([key, label]) => (
              <th key={key} style={{ width: widths[key] }} className="relative px-3 py-2 text-left font-semibold text-foreground">
                {label}
                <span
                  onMouseDown={(e) => startResize(key, e)}
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-400"
                  title="Drag to resize"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.emp} className="border-b border-border/60 group">
              <td className="px-3 py-2 font-medium truncate">{r.emp}</td>
              <td className="px-3 py-2 font-mono">{r.in}</td>
              <td className="px-3 py-2 font-mono">{r.out}</td>
              <td className="px-2 py-1">
                <input
                  value={r.note}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], note: e.target.value };
                    setRows(next);
                  }}
                  placeholder="Click to edit…"
                  className="w-full h-7 px-2 text-xs rounded-[8px] border border-transparent hover:border-border focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300 bg-transparent group-hover:bg-muted/30"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground px-3 py-2 bg-muted/20 border-t border-border">
        Drag header edges to resize · inline cell edit on note column
      </p>
    </div>
  );
}

function AdvancedGroupTreeDemo() {
  const [open, setOpen] = useState<Record<string, boolean>>({ HR: true, Sales: true, Finance: false });
  const groups = [
    { dept: "HR", people: MOCK_EMPLOYEES.filter((e) => e.department.includes("Human")) },
    { dept: "Sales", people: MOCK_EMPLOYEES.filter((e) => e.department === "Sales" || e.department.includes("Field")) },
    { dept: "Finance", people: MOCK_EMPLOYEES.filter((e) => e.department.includes("Finance")) },
  ];
  const tree = [
    { id: "org", name: "Dharitri Sutra", level: 0, count: 248 },
    { id: "ho", name: "Pune HO", level: 1, count: 120 },
    { id: "hr", name: "Human Resources", level: 2, count: 12 },
    { id: "fin", name: "Finance", level: 2, count: 18 },
    { id: "ngp", name: "Nagpur Branch", level: 1, count: 64 },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-border overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 border-b border-border text-xs font-semibold">Grouped by department</div>
        {groups.map((g) => (
          <div key={g.dept}>
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [g.dept]: !o[g.dept] }))}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-brand-50/40 border-b border-border hover:bg-brand-50"
            >
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", open[g.dept] && "rotate-90")} />
              {g.dept}
              <span className="ml-auto text-[10px] text-muted-foreground">{g.people.length}</span>
            </button>
            {open[g.dept] && g.people.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 pl-9 text-xs border-b border-border/50">
                <span className="font-mono text-brand-700 text-[11px]">{p.code}</span>
                <span className="font-medium">{p.name}</span>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="rounded-[12px] border border-border overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 border-b border-border text-xs font-semibold">Org tree table</div>
        {tree.map((n) => (
          <div key={n.id} className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-border/50" style={{ paddingLeft: 12 + n.level * 16 }}>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">{n.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{n.count} emp</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EnterpriseDatagridSection() {
  const [gridState, setGridState] = useState<GridState>("data");

  return (
    <SectionShell overview="Enterprise Datagrid is the strongest Template listing pattern for HRMS operations: Employee Directory, Attendance, Leave, Payroll, Salary Revision, Assets, and Recruitment — with Excel filters, freeze, resize, grouping, tree, density, bulk actions, editable cells, and full table states.">
      <SectionBlock title="Interactive HRMS datagrids" subtitle="Seven operational datasets · toggle table states below">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(["data", "loading", "empty", "no-results", "error"] as GridState[]).map((s) => (
            <button key={s} onClick={() => setGridState(s)}
              className={cn("h-7 px-2.5 text-[11px] rounded-[8px] border font-medium capitalize",
                gridState === s ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted")}>
              {s.replace("-", " ")}
            </button>
          ))}
        </div>
        <PreviewFrame title="Enterprise datagrid · live mock">
          <TplTabs defaultValue="employees">
            <TplTabsList variant="segment" className="w-full flex-wrap h-auto">
              {Object.entries(DATASETS).map(([k, d]) => (
                <TplTabsTrigger key={k} value={k} variant="segment" className="text-xs h-9 flex-1 min-w-[100px]">{d.label}</TplTabsTrigger>
              ))}
            </TplTabsList>
            {Object.keys(DATASETS).map((k) => (
              <TplTabsContent key={k} value={k}>
                <DataGrid dsKey={k} stateOverride={gridState === "data" ? undefined : gridState} />
              </TplTabsContent>
            ))}
          </TplTabs>
        </PreviewFrame>
      </SectionBlock>

      <SectionBlock title="Feature variants" subtitle="Patterns demonstrated in the live grid above">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            "Excel filters", "Column resize", "Pin / freeze", "Grouping",
            "Density", "Column visibility", "Search", "Pagination",
            "Bulk select", "Bulk actions", "Context menu", "Export / Import",
            "Totals footer", "Tree table", "Expandable rows", "Editable cells",
            "Status chips", "Loading", "Empty", "Error",
          ].map((f) => (
            <div key={f} className="rounded-[12px] border border-border bg-muted/20 px-3 py-2 text-xs font-medium text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3 text-brand-600 shrink-0" />{f}
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Advanced patterns" subtitle="Resize · editable cells · grouping · org tree">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PreviewFrame title="Column resize + editable cells (Attendance)">
            <AdvancedResizeEditableDemo />
          </PreviewFrame>
          <PreviewFrame title="Grouping + org tree">
            <AdvancedGroupTreeDemo />
          </PreviewFrame>
        </div>
      </SectionBlock>

      <ErpUseCase
        title="ERP transaction listings"
        description="Same datagrid shell for Sales Invoices, GRN, and Stock ledgers: freeze voucher number, Excel filters on status/party, bulk export, sticky totals. Apply only when redesigning those modules."
      />

      <BestPractices items={[
        "Pin the primary identifier column (Code, Request ID) — users must never lose row context while scrolling.",
        "Separate global search from per-column Excel filters; combine both for power users on 500+ row datasets.",
        "Show bulk action bar only when rows are selected; include Clear to reset without accidental clicks.",
        "Use compact density by default; offer comfortable mode for accessibility and long reading sessions.",
        "Sticky footer carries pagination + aggregate totals — never bury counts below the scroll fold.",
      ]} />

      <DoDont
        dos={["Handle loading, empty, no-results, and error states explicitly", "Use status pills with dot indicators for scanability", "Keep row actions in a hover-revealed ⋮ menu", "Scope datagrid queries by FY and branch context in production"]}
        donts={["Don't stack full-page reloads for sort/filter — client or server-side without flash", "Don't show all 20 columns by default — use column visibility", "Don't use native HTML select for column filters", "Don't omit keyboard focus rings on filter popovers"]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TokenUsage tokens={[
          { token: "rounded-[12px]", use: "Datagrid container border radius" },
          { token: "bg-brand-50/60", use: "Active sort column + selected row fill" },
          { token: "text-brand-700", use: "Code cells, active sort labels" },
          { token: "sticky top-0 / bottom-0", use: "Header and footer bars inside scroll region" },
          { token: "text-xs", use: "Cell text — compact ERP density" },
        ]} />
        <AccessibilityNotes items={[
          "Checkbox column supports select-all with indeterminate state in production implementations.",
          "Sort buttons need aria-sort on column headers; filter popovers trap focus while open.",
          "Bulk bar actions should announce selection count to screen readers via live region.",
          "Density toggle must persist user preference (localStorage or profile setting).",
        ]} />
      </div>

      <ProductionNotes items={[
        "Wire server-side pagination and sorting for datasets above ~200 rows; keep the same toolbar UX.",
        "Column filter popovers map to query params or API filter objects — not client-only for production HRMS.",
        "Export should respect active filters, hidden columns, and FY scope; import needs validation preview step.",
        "Expandable rows are for read-only detail — open full drawer/page for edit workflows.",
      ]} />
    </SectionShell>
  );
}
