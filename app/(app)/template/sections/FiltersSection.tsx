"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  SlidersHorizontal, Search, X, ChevronDown, Calendar,
  Filter, Check, RotateCcw,
} from "lucide-react";

// ── Shared ────────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
    </p>
  );
}

function SectionBlock({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Pattern 1: Compact filter button + Popover (RECOMMENDED) ──────────────────
function FilterPopoverDemo() {
  const [status, setStatus]   = useState<string[]>([]);
  const [search, setSearch]   = useState("");

  const toggleStatus = (v: string) =>
    setStatus(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const filterCount = status.length;
  const hasFilters  = search.trim() !== "" || filterCount > 0;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-white border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8 h-8 text-xs rounded-lg"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter button */}
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 transition-colors font-medium",
              filterCount > 0
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {filterCount > 0 && (
                <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                  {filterCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-0">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Filter</p>
            </div>

            {/* Status filter */}
            <div className="px-3 py-2.5 border-b border-border space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              {["Active", "Inactive", "Pending", "Archived"].map(v => (
                <label key={v} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                    checked={status.includes(v)}
                    onChange={() => toggleStatus(v)}
                  />
                  <span className="text-xs text-foreground group-hover:text-brand-700 transition-colors">{v}</span>
                </label>
              ))}
            </div>

            {/* Date range (static preview) */}
            <div className="px-3 py-2.5 border-b border-border space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Date Range</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Input type="date" className="h-7 text-xs rounded-md px-2" />
                <Input type="date" className="h-7 text-xs rounded-md px-2" />
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-3 py-2 flex items-center justify-between">
              <button
                onClick={() => { setStatus([]); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <button className="h-7 px-3 text-xs bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors">
                Apply
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active filter chips */}
        {status.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
            {v}
            <button onClick={() => toggleStatus(v)} className="hover:text-brand-900 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setStatus([]); }}
            className="ml-auto h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <p className="text-xs text-emerald-700 font-medium">
          ✓ Recommended pattern — compact toolbar, filter button, active chips, single reset.
        </p>
      </div>
    </div>
  );
}

// ── Pattern 2: Inline status pill tabs ───────────────────────────────────────
function InlinePillFilterDemo() {
  const [active, setActive] = useState("");

  return (
    <div className="space-y-3">
      <div className="bg-white border border-border rounded-xl px-4 py-2.5 flex items-center gap-1.5 flex-wrap">
        {["", "active", "inactive", "pending"].map(v => (
          <button
            key={v}
            onClick={() => setActive(v)}
            className={cn(
              "h-7 px-3 text-xs rounded-lg border transition-colors font-medium",
              active === v
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {v === "" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground px-1">
        Use for: simple 2–4 status filters where all options are visible at once. Don't use for 5+ options.
      </p>
    </div>
  );
}

// ── Pattern 3: Full filter panel (side drawer style) ─────────────────────────
function FilterPanelDemo() {
  const [zones,    setZones]   = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["Active"]);

  const toggle = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, v: string) =>
    setArr(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const totalActive = zones.length + statuses.length;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* Main content placeholder */}
        <div className="flex-1 bg-muted/20 rounded-xl border border-border/50 flex items-center justify-center h-48">
          <p className="text-xs text-muted-foreground">Content area</p>
        </div>

        {/* Filter panel */}
        <div className="w-52 bg-white border border-border rounded-xl shadow-sm flex-shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Filters</p>
              {totalActive > 0 && (
                <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center">
                  {totalActive}
                </span>
              )}
            </div>
            {totalActive > 0 && (
              <button
                onClick={() => { setZones([]); setStatuses([]); }}
                className="text-[11px] text-brand-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="p-3 space-y-4 overflow-y-auto">
            {/* Status */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
              {["Active", "Inactive", "Pending"].map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-brand-600 cursor-pointer"
                    checked={statuses.includes(v)}
                    onChange={() => toggle(statuses, setStatuses, v)}
                  />
                  <span className="text-xs text-foreground">{v}</span>
                </label>
              ))}
            </div>

            {/* Zone */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Zone</p>
              {["North", "South", "East", "West"].map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-brand-600 cursor-pointer"
                    checked={zones.includes(v)}
                    onChange={() => toggle(zones, setZones, v)}
                  />
                  <span className="text-xs text-foreground">{v}</span>
                </label>
              ))}
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Date Range</p>
              <Input type="date" className="h-7 text-xs rounded-md px-2" />
              <Input type="date" className="h-7 text-xs rounded-md px-2" />
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground px-1">
        Use for: pages with many filter dimensions (reports, analytics). Persistent sidebar panel.
      </p>
    </div>
  );
}

// ── Pattern 4: Search + quick sort dropdown ───────────────────────────────────
function SearchSortDemo() {
  const [sort, setSort]   = useState("name");
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState("");

  const sortLabels: Record<string, string> = {
    name: "Name A–Z", date: "Date (Newest)", status: "Status",
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8 h-8 text-xs rounded-lg"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="h-8 px-2.5 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            {sortLabels[sort]}
            <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-20 w-40 overflow-hidden">
              {Object.entries(sortLabels).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setSort(val); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                >
                  {sort === val && <Check className="w-3 h-3 text-brand-600 flex-shrink-0" />}
                  <span className={sort === val ? "ml-0" : "ml-5"}>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground px-1">
        Use for: search + sort combo without status filters. Sort dropdown shows active checkmark.
      </p>
    </div>
  );
}

// ── Pattern 5: Column header sort (inline table) ──────────────────────────────
function ColumnSortDemo() {
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggle = (k: string) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const cols = ["code", "name", "status"] as const;

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {cols.map(col => {
                const active = sortKey === col;
                return (
                  <th
                    key={col}
                    onClick={() => toggle(col)}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
                      active && "bg-brand-50/60",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={active ? "text-brand-700" : "text-foreground capitalize"}>{col}</span>
                      {active ? (
                        <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
                      ) : (
                        <span className="text-muted-foreground/40 text-[10px] group-hover:text-muted-foreground transition-colors">⇅</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[
              { code: "DEPT-001", name: "Sales",    status: "Active"   },
              { code: "DEPT-002", name: "HR",        status: "Active"   },
              { code: "DEPT-003", name: "Accounts",  status: "Inactive" },
            ].map((row, i) => (
              <tr key={i} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2 font-mono text-xs text-brand-700 font-semibold">{row.code}</td>
                <td className="px-4 py-2 text-xs font-medium text-foreground">{row.name}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground px-1">
        Active sorted column → brand-50 header background + brand-700 label + ChevronDown (flips for desc).
        Unsorted columns → ⇅ icon fades in on hover.
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FiltersSection() {
  return (
    <div className="space-y-10">

      <div>
        <h2 className="text-sm font-semibold text-foreground">Filter Patterns</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Five enterprise filter patterns — pick the right one based on complexity and screen real estate.
        </p>
      </div>

      <SectionBlock
        label="Pattern 1 — Filter Button + Popover (Recommended)"
        desc="Compact toolbar with a single Filter button that opens a Popover. Active filters shown as dismissible chips."
      >
        <FilterPopoverDemo />
      </SectionBlock>

      <SectionBlock
        label="Pattern 2 — Inline Status Pill Tabs"
        desc="All filter options visible as pill buttons. Best for 2–4 mutually exclusive options."
      >
        <InlinePillFilterDemo />
      </SectionBlock>

      <SectionBlock
        label="Pattern 3 — Full Filter Panel (Sidebar)"
        desc="Persistent filter panel alongside content. Best for reports and analytics with many filter dimensions."
      >
        <FilterPanelDemo />
      </SectionBlock>

      <SectionBlock
        label="Pattern 4 — Search + Sort Dropdown"
        desc="Search input combined with a sort order dropdown. Use when filtering is not needed but ordering is."
      >
        <SearchSortDemo />
      </SectionBlock>

      <SectionBlock
        label="Pattern 5 — Column Header Sort"
        desc="Click any column header to sort. Active column highlighted with brand color and chevron icon."
      >
        <ColumnSortDemo />
      </SectionBlock>

      {/* Decision guide */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-brand-700 mb-3">Which Pattern to Use?</p>
        <div className="space-y-2 text-xs text-brand-800/80">
          <p>• <strong>Pattern 1 (Popover)</strong> — Default for all master data listings (Department, Customer, Product, etc.)</p>
          <p>• <strong>Pattern 2 (Pills)</strong> — Only when you have 2–4 mutually exclusive status options and always-visible</p>
          <p>• <strong>Pattern 3 (Panel)</strong> — Reports, analytics, any page with 5+ filter dimensions</p>
          <p>• <strong>Pattern 4 (Sort only)</strong> — Simple lists where search + ordering is all that's needed</p>
          <p>• <strong>Pattern 5 (Column sort)</strong> — Always combine with Patterns 1–4; column sort is additive</p>
        </div>
      </div>
    </div>
  );
}
