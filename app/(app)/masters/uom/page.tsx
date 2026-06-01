"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Ruler,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Upload,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Check,
  Search,
} from "lucide-react";
import {
  UOMMaster,
  loadUOMMasters,
  saveUOMMasters,
  todayStr,
} from "./uom-data";

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
} as const;

function StatusPill({ status }: { status: "active" | "inactive" }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

// ── Sortable column header ────────────────────────────────────────────────────
type SortKey = "unitCode" | "unitName" | "shortName" | "baseUnit" | "conversionFactor" | "status" | "updatedBy" | "updatedDate";

function SortTh({ label, col, sortKey, sortDir, onSort, className }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap group",
        active && "bg-brand-50/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active
          ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />}
      </div>
    </th>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UOMPage() {
  const router = useRouter();
  const [records, setRecords] = useState<UOMMaster[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("unitCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "toggle" | "delete";
    record: UOMMaster;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { setRecords(loadUOMMasters()); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleFilter = (v: string) =>
    setFilterStatus(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const filtered = useMemo(() => {
    return records
      .filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.unitCode.toLowerCase().includes(q) ||
          r.unitName.toLowerCase().includes(q) ||
          r.shortName.toLowerCase().includes(q) ||
          r.baseUnit.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        );
      })
      .filter(r => filterStatus.length === 0 || filterStatus.includes(r.status))
      .sort((a, b) => {
        let aVal: any = a[sortKey as keyof UOMMaster];
        let bVal: any = b[sortKey as keyof UOMMaster];
        if (typeof aVal === "string") { aVal = aVal.toLowerCase(); bVal = (bVal as string).toLowerCase(); }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, filterStatus, sortKey, sortDir]);

  const totalCount = records.length;
  const activeCount = records.filter(r => r.status === "active").length;
  const inactiveCount = records.filter(r => r.status === "inactive").length;

  const confirmToggle = (record: UOMMaster) => setConfirmDialog({ type: "toggle", record });
  const confirmDelete = (record: UOMMaster) => setConfirmDialog({ type: "delete", record });

  const executeToggle = () => {
    if (!confirmDialog) return;
    const { record } = confirmDialog;
    const newStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map(r =>
      r.id === record.id
        ? { ...r, status: newStatus as "active" | "inactive", updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() }
        : r
    );
    setRecords(updated);
    saveUOMMasters(updated);
    setToast({ msg: `Unit marked ${newStatus}`, type: "success" });
    setConfirmDialog(null);
  };

  const executeDelete = () => {
    if (!confirmDialog) return;
    const updated = records.filter(r => r.id !== confirmDialog.record.id);
    setRecords(updated);
    saveUOMMasters(updated);
    setToast({ msg: "Unit deleted", type: "success" });
    setConfirmDialog(null);
  };

  const hasFilters = search || filterStatus.length > 0;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Unit Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage units of measure used across products, inventory, procurement and sales
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
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
          {[
            { label: "Total Units", value: totalCount, icon: Ruler, accent: true },
            { label: "Active", value: activeCount, icon: CheckCircle2, accent: false },
            { label: "Inactive", value: inactiveCount, icon: XCircle, accent: false },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-[340px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by code, name, short name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-[7px] text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                filterStatus.length > 0
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {filterStatus.length > 0 && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter by Status</p>
              </div>
              <div className="px-3 py-2.5 space-y-2">
                {["active", "inactive"].map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
                      checked={filterStatus.includes(v)} onChange={() => toggleFilter(v)} />
                    <span className="text-xs capitalize text-foreground">{v}</span>
                  </label>
                ))}
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button onClick={() => setFilterStatus([])} className="text-xs text-brand-600 hover:underline">Clear filter</button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Active chips */}
          {filterStatus.map(v => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
              {v.charAt(0).toUpperCase() + v.slice(1)}
              <button onClick={() => toggleFilter(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}

          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterStatus([]); }}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
              Clear all
            </button>
          )}
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-28" />
                <col className="w-44" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-20" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-12" />
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Unit Code" col="unitCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Unit Name" col="unitName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Short Name" col="shortName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Base Unit" col="baseUnit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Conv. Factor" col="conversionFactor" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Active</th>
                  <SortTh label="Updated By" col="updatedBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Updated On" col="updatedDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Ruler className="w-5 h-5 text-muted-foreground" />
                        </div>
                        {hasFilters ? (
                          <>
                            <p className="text-sm font-medium text-foreground">No units match your filters</p>
                            <button onClick={() => { setSearch(""); setFilterStatus([]); }}
                              className="text-xs text-brand-600 hover:underline">Clear filters</button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">No units yet</p>
                            <p className="text-xs text-muted-foreground">Add your first unit to get started.</p>
                            <button onClick={() => router.push("/masters/uom/add")}
                              className="text-xs text-brand-600 hover:underline mt-1">+ Add Unit</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => (
                    <tr key={record.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                      {/* Unit Code */}
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs font-semibold text-brand-700">{record.unitCode}</span>
                      </td>
                      {/* Unit Name */}
                      <td className="px-4 py-2">
                        <button
                          onClick={() => router.push(`/masters/uom/${record.id}/edit`)}
                          className="text-xs font-semibold text-foreground hover:text-brand-700 transition-colors text-left"
                        >
                          {record.unitName}
                        </button>
                        {record.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{record.description}</p>
                        )}
                      </td>
                      {/* Short Name */}
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs font-semibold text-slate-600">{record.shortName}</span>
                      </td>
                      {/* Base Unit */}
                      <td className="px-4 py-2">
                        {record.baseUnit ? (
                          <span className="font-mono text-xs font-medium text-foreground">{record.baseUnit}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Base unit</span>
                        )}
                      </td>
                      {/* Conversion Factor */}
                      <td className="px-4 py-2">
                        {record.baseUnit ? (
                          <span className="text-xs text-foreground">
                            {record.conversionFactor} {record.baseUnit}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-2">
                        <StatusPill status={record.status} />
                      </td>
                      {/* Active toggle */}
                      <td className="px-4 py-2">
                        <Switch
                          checked={record.status === "active"}
                          onCheckedChange={() => confirmToggle(record)}
                        />
                      </td>
                      {/* Updated By */}
                      <td className="px-4 py-2">
                        <span className="text-xs text-muted-foreground">{record.updatedBy}</span>
                      </td>
                      {/* Updated On */}
                      <td className="px-4 py-2">
                        <span className="text-xs text-muted-foreground">{record.updatedDate}</span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => router.push(`/masters/uom/${record.id}/edit`)}
                              className="text-xs gap-2"
                            >
                              <Eye className="w-3.5 h-3.5" /> View / Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/masters/uom/${record.id}/edit`)}
                              className="text-xs gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => confirmToggle(record)}
                              className="text-xs gap-2"
                            >
                              {record.status === "active" ? (
                                <><XCircle className="w-3.5 h-3.5" /> Deactivate</>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5" /> Activate</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => confirmDelete(record)}
                              className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
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
          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> units
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <Dialog open onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  confirmDialog.type === "delete"
                    ? "bg-red-50 border border-red-200"
                    : "bg-amber-50 border border-amber-200",
                )}>
                  <AlertTriangle className={cn("w-4 h-4",
                    confirmDialog.type === "delete" ? "text-red-500" : "text-amber-500")} />
                </div>
                {confirmDialog.type === "delete" ? "Delete Unit?" : "Change Status?"}
              </DialogTitle>
              <DialogDescription className="pt-1">
                {confirmDialog.type === "delete"
                  ? `Are you sure you want to delete "${confirmDialog.record.unitName}"? This action cannot be undone.`
                  : `Mark "${confirmDialog.record.unitName}" as ${confirmDialog.record.status === "active" ? "inactive" : "active"}?`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmDialog(null)}>Cancel</Button>
              <Button
                size="sm"
                className={cn("h-8 text-xs gap-1.5",
                  confirmDialog.type === "delete"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-brand-600 hover:bg-brand-700 text-white")}
                onClick={confirmDialog.type === "delete" ? executeDelete : executeToggle}
              >
                <Check className="w-3.5 h-3.5" />
                {confirmDialog.type === "delete" ? "Delete" : "Confirm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
          "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
          toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
        )}>
          <Check className="w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
