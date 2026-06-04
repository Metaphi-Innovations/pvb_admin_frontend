"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Ruler,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Edit2,
  MoreVertical,
  SlidersHorizontal,
  X,
  ChevronsUpDown,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  UOMMaster,
  loadUOMMasters,
  saveUOMMasters,
  todayStr,
} from "./uom-data";

type SortKey = "uomId" | "unitName" | "shortName" | "decimalAllowed" | "baseUnit" | "status";

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const cfg = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    inactive: "border-slate-200 bg-slate-100 text-slate-700",
  }[status];

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center justify-center", cfg)}>
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

export default function UOMPage() {
  const router = useRouter();
  const [records, setRecords] = useState<UOMMaster[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterDecimal, setFilterDecimal] = useState<string[]>([]);
  const [filterBase, setFilterBase] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("uomId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setRecords(loadUOMMasters());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    return records
      .filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return r.unitName.toLowerCase().includes(q) || r.shortName.toLowerCase().includes(q);
      })
      .filter(r => {
        if (filterStatus.length === 0) return true;
        return filterStatus.includes(r.status);
      })
      .filter(r => {
        if (filterDecimal.length === 0) return true;
        const decVal = r.decimalAllowed ? "yes" : "no";
        return filterDecimal.includes(decVal);
      })
      .filter(r => {
        if (filterBase.length === 0) return true;
        const baseVal = r.baseUnit ? "yes" : "no";
        return filterBase.includes(baseVal);
      })
      .sort((a, b) => {
        let aVal: any = a[sortKey];
        let bVal: any = b[sortKey];
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, filterStatus, filterDecimal, filterBase, sortKey, sortDir]);

  const totalCount = records.length;
  const activeCount = records.filter(r => r.status === "active").length;
  const inactiveCount = records.filter(r => r.status === "inactive").length;

  const handleToggleStatus = (record: UOMMaster) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map(r =>
      r.id === record.id
        ? {
          ...r,
          status: newStatus as "active" | "inactive",
          updatedBy: "Admin",
          updatedDate: todayStr(),
        }
        : r
    ) as UOMMaster[];
    setRecords(updated);
    saveUOMMasters(updated);
    setToast({
      msg: `Unit status updated to ${newStatus === "active" ? "Active" : "Inactive"} successfully`,
      type: "success",
    });
  };

  const toggleFilterStatus = (status: string) => {
    setFilterStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleFilterDecimal = (val: string) => {
    setFilterDecimal(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const toggleFilterBase = (val: string) => {
    setFilterBase(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Unit Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage units of measure used across products and stock metrics
            </p>
          </div>
          <div className="flex items-center flex-shrink-0 gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 border border-border bg-white text-foreground hover:bg-muted"
              variant="outline"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => router.push("/masters/uom/add")}
            >
              <Plus className="w-3.5 h-3.5" /> Add Unit
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600">
              <Ruler className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">
                {totalCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Total Units
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-muted">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">
                {activeCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-muted">
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">
                {inactiveCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Inactive
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search unit name or short name..."
              className="h-8 text-xs"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length > 0 || filterDecimal.length > 0 || filterBase.length > 0
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {(filterStatus.length > 0 || filterDecimal.length > 0 || filterBase.length > 0) && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length + filterDecimal.length + filterBase.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0 bg-white border shadow-lg border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter Units</p>
              </div>
              <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Decimal Allowed</p>
                  {["yes", "no"].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterDecimal.includes(v)}
                        onChange={() => toggleFilterDecimal(v)}
                      />
                      <span className="text-xs capitalize text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Base Unit</p>
                  {["yes", "no"].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterBase.includes(v)}
                        onChange={() => toggleFilterBase(v)}
                      />
                      <span className="text-xs capitalize text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  {["active", "inactive"].map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterStatus.includes(v)}
                        onChange={() => toggleFilterStatus(v)}
                      />
                      <span className="text-xs capitalize text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {(filterStatus.length > 0 || filterDecimal.length > 0 || filterBase.length > 0) && (
                <div className="px-3 py-2 border-t border-border bg-muted/10">
                  <button
                    onClick={() => {
                      setFilterStatus([]);
                      setFilterDecimal([]);
                      setFilterBase([]);
                    }}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {filterDecimal.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              Decimal: {v === "yes" ? "Yes" : "No"}
              <button onClick={() => toggleFilterDecimal(v)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {filterBase.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              Base Unit: {v === "yes" ? "Yes" : "No"}
              <button onClick={() => toggleFilterBase(v)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {filterStatus.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              {v === "active" ? "Active" : "Inactive"}
              <button onClick={() => toggleFilterStatus(v)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden bg-white border shadow-sm border-border rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <SortTh label="Unit ID" colKey="uomId" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[110px] pl-4 py-3" />
                  <SortTh label="Unit Name" colKey="unitName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[180px]" />
                  <SortTh label="Short Name" colKey="shortName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[110px]" />
                  <SortTh label="Decimal Allowed" colKey="decimalAllowed" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[130px]" />
                  <SortTh label="Base Unit" colKey="baseUnit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[110px]" />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[110px]" />
                  <th className="sticky right-0 z-30 w-[72px] min-w-[72px] h-11 px-2 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                          <Ruler className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          No unit configs found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {search || filterStatus.length > 0 || filterDecimal.length > 0 || filterBase.length > 0
                            ? "Try adjusting your search or filters"
                            : "Add your first unit configuration to get started"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => (
                    <tr
                      key={record.id}
                      className="align-top transition-colors border-b border-border/60 hover:bg-muted/20 group"
                    >
                      <td className="px-3 py-2 text-[11px] font-semibold font-mono text-brand-700 whitespace-nowrap">
                        {record.uomId}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-foreground whitespace-nowrap">
                        {record.unitName}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-foreground whitespace-nowrap font-mono font-semibold">
                        {record.shortName}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap font-medium">
                        {record.decimalAllowed ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Yes</span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap font-medium">
                        {record.baseUnit ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">Yes</span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(record)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-0.5 py-0.5 transition-opacity focus:outline-none",
                            record.status === "active" ? "hover:opacity-90" : "hover:opacity-90",
                          )}
                          title="Click to toggle status"
                        >
                          <StatusBadge status={record.status} />
                        </button>
                      </td>
                      <td className="sticky right-0 z-20 w-[72px] min-w-[72px] px-2 py-2 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex items-center justify-center transition-colors rounded-md w-7 h-7 text-muted-foreground hover:bg-muted focus:outline-none">
                              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border shadow-lg border-border">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/masters/uom/${record.id}/edit`)
                              }
                              className="flex items-center gap-2 text-xs cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> units
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          )}
        >
          <Check className="flex-shrink-0 w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}

// SortTh Component
function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  colKey: SortKey;
  sortKey: string;
  sortDir: string;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-3 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>
          {label}
        </span>
        {active ? (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-brand-600 transition-transform",
              sortDir === "desc" && "rotate-180"
            )}
          />
        ) : (
          <ChevronsUpDown className="w-3 h-3 transition-colors text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
      </div>
    </th>
  );
}
