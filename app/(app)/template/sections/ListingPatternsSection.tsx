"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Download, Search, MoreVertical, Eye, Edit2, Trash2,
  SlidersHorizontal, ChevronDown, ChevronsUpDown, X,
  Building2, CheckCircle2, XCircle, Archive,
} from "lucide-react";

// ── Status Pill ───────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  archived: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Mini Switch (for table rows) ──────────────────────────────────────────────
function MiniSwitch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-brand-600" : "bg-muted-foreground/30",
      )}
    >
      <span className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
        checked ? "translate-x-4" : "translate-x-0",
      )} />
    </button>
  );
}

// ── Sort header ───────────────────────────────────────────────────────────────
function SortTh({
  label, colKey, sortKey, sortDir, onSort, width,
}: {
  label: string; colKey: string; sortKey: string; sortDir: "asc" | "desc";
  onSort: (k: string) => void; width?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        width,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active
          ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        }
      </div>
    </th>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, accent }: {
  label: string; value: number; icon: React.ElementType; accent?: boolean;
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

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_DATA = [
  { id: 1, code: "DEPT-001", name: "Sales",        status: "active",   remarks: "" },
  { id: 2, code: "DEPT-002", name: "HR",           status: "active",   remarks: "" },
  { id: 3, code: "DEPT-003", name: "Accounts",     status: "active",   remarks: "" },
  { id: 4, code: "DEPT-004", name: "Procurement",  status: "inactive", remarks: "Under review" },
  { id: 5, code: "DEPT-005", name: "Field Force",  status: "active",   remarks: "" },
];

// ── Live demo ─────────────────────────────────────────────────────────────────
function LiveDemoTable() {
  const [data,   setData]   = useState(DEMO_DATA);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggle = (v: string) =>
    setFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const toggleRowStatus = (id: number) =>
    setData(prev => prev.map(d =>
      d.id === id ? { ...d, status: d.status === "active" ? "inactive" : "active" } : d,
    ));

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let r = [...data];
    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(d => d.name.toLowerCase().includes(t) || d.code.toLowerCase().includes(t));
    }
    if (filter.length > 0) r = r.filter(d => filter.includes(d.status));
    r.sort((a, b) => {
      const c = String((a as any)[sortKey]).localeCompare(String((b as any)[sortKey]));
      return sortDir === "asc" ? c : -c;
    });
    return r;
  }, [data, search, filter, sortKey, sortDir]);

  const summary = {
    total:    data.length,
    active:   data.filter(d => d.status === "active").length,
    inactive: data.filter(d => d.status === "inactive").length,
  };

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total" value={summary.total}    icon={Building2}    accent />
        <KpiCard label="Active"  value={summary.active}  icon={CheckCircle2}       />
        <KpiCard label="Inactive" value={summary.inactive} icon={XCircle}          />
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
        {/* Header actions */}
        <div className="flex items-center gap-1.5 mr-auto">
          <button className="h-8 px-2.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-muted inline-flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="h-8 px-2.5 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8 h-8 text-xs rounded-lg w-full"
          />
        </div>

        {/* Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
              filter.length > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
            )}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {filter.length > 0 && (
                <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                  {filter.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-0">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Status</p>
            </div>
            <div className="px-3 py-2.5 space-y-2">
              {["active", "inactive"].map(v => (
                <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                    checked={filter.includes(v)} onChange={() => toggle(v)} />
                  <span className="text-xs capitalize text-foreground">{v}</span>
                </label>
              ))}
            </div>
            {filter.length > 0 && (
              <div className="px-3 py-2 border-t border-border">
                <button onClick={() => setFilter([])} className="text-xs text-brand-600 hover:underline">Clear</button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Active filter chips */}
        {filter.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
            {v.charAt(0).toUpperCase() + v.slice(1)}
            <button onClick={() => toggle(v)}><X className="w-3 h-3" /></button>
          </span>
        ))}

        <p className="text-[11px] text-muted-foreground whitespace-nowrap">{filtered.length}/{summary.total}</p>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <SortTh label="Code"   colKey="code"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width="w-36" />
              <SortTh label="Name"   colKey="name"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width="w-44" />
              <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width="w-28" />
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-foreground w-24">Active</th>
              <th className="px-3 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <p className="text-sm font-medium text-foreground">No records found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
                </td>
              </tr>
            ) : filtered.map(row => (
              <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-2">
                  <span className="font-mono text-xs font-semibold text-brand-700">{row.code}</span>
                </td>
                <td className="px-4 py-2">
                  <p className="text-xs font-semibold text-foreground">{row.name}</p>
                  {row.remarks && <p className="text-[11px] text-muted-foreground mt-0.5">{row.remarks}</p>}
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-2 text-center">
                  <MiniSwitch checked={row.status === "active"} onToggle={() => toggleRowStatus(row.id)} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs gap-2"><Eye className="w-3.5 h-3.5" /> View</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2"><Edit2 className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2"><Archive className="w-3.5 h-3.5" /> Archive</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{summary.total}</span> records
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ListingPatternsSection() {
  return (
    <div className="space-y-8">

      <div>
        <h2 className="text-sm font-semibold text-foreground">Listing Patterns</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Master data listing pattern — KPI cards, toolbar with search + filter popover,
          sortable column headers, status badge, inline active switch, action menu.
          This is the canonical pattern for all master data modules (Department, Customer, Product, etc.)
        </p>
      </div>

      <LiveDemoTable />

      {/* Anatomy guide */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-brand-700">Listing Pattern Anatomy</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-brand-800/80">
          <p>1. Page header — title + subtitle + CTA buttons</p>
          <p>2. KPI cards — 3-column grid, brand accent on primary</p>
          <p>3. Toolbar — search + filter button (Popover) + active chips + count</p>
          <p>4. Filter Popover — checkboxes per dimension, clear link at bottom</p>
          <p>5. Table container — rounded-xl border, shadow-sm, overflow-hidden</p>
          <p>6. Table headers — sortable with ChevronsUpDown / ChevronDown icons</p>
          <p>7. Active sorted column — bg-brand-50/60 header + brand-700 label text</p>
          <p>8. Code cell — font-mono text-xs font-semibold text-brand-700</p>
          <p>9. Name cell — primary label + optional subtitle (remarks, role)</p>
          <p>10. Status — StatusPill (dot + text, rounded-full)</p>
          <p>11. Active column — custom Switch (not native checkbox)</p>
          <p>12. Action menu — MoreVertical trigger, opacity-0 → group-hover:opacity-100</p>
          <p>13. Table footer — record count, right-side clear filters link</p>
          <p>14. Empty state — centered icon + message + CTA</p>
        </div>
      </div>
    </div>
  );
}
