"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Percent,
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
  AlertTriangle,
  Check,
  Code2,
} from "lucide-react";
import {
  HSNMaster,
  loadHSNMasters,
  saveHSNMasters,
  todayStr,
} from "./hsn-data";
import { loadGSTMasters } from "../gst/gst-data";

type SortKey = "hsnId" | "hsnCode" | "hsnDescription" | "gstRate" | "applicableCategory" | "status";

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

export default function HSNPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HSNMaster[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterGstRate, setFilterGstRate] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("hsnId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "toggle";
    record: HSNMaster;
  } | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setRecords(loadHSNMasters());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const gstRatesList = React.useMemo(() => {
    try {
      const list = loadGSTMasters();
      if (list && list.length > 0) {
        const sorted = [...list].sort((a, b) => a.gstPercentage - b.gstPercentage);
        return Array.from(new Set(sorted.map(g => `${g.gstPercentage}%`)));
      }
    } catch {
      // ignore
    }
    return ["0%", "5%", "12%", "18%", "28%"];
  }, []);

  const filtered = records
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.hsnCode.toLowerCase().includes(q) ||
        r.hsnDescription.toLowerCase().includes(q) ||
        r.applicableCategory.toLowerCase().includes(q)
      );
    })
    .filter(r => {
      if (filterStatus.length === 0) return true;
      return filterStatus.includes(r.status);
    })
    .filter(r => {
      if (filterCategory.length === 0) return true;
      return filterCategory.includes(r.applicableCategory);
    })
    .filter(r => {
      if (filterGstRate.length === 0) return true;
      return filterGstRate.includes(r.gstRate);
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

  const totalCount = records.length;
  const activeCount = records.filter(r => r.status === "active").length;
  const inactiveCount = records.filter(r => r.status === "inactive").length;

  const handleToggleStatus = (record: HSNMaster) => {
    setConfirmDialog({ type: "toggle", record });
  };

  const confirmToggleStatus = () => {
    const record = confirmDialog?.record;
    if (!record) return;
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
    ) as HSNMaster[];
    setRecords(updated);
    saveHSNMasters(updated);
    setToast({
      msg: `HSN status updated to ${newStatus === "active" ? "Active" : "Inactive"} successfully`,
      type: "success",
    });
    setConfirmDialog(null);
  };

  const toggleFilterStatus = (status: string) => {
    setFilterStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleFilterCategory = (cat: string) => {
    setFilterCategory(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleFilterGstRate = (rate: string) => {
    setFilterGstRate(prev =>
      prev.includes(rate) ? prev.filter(r => r !== rate) : [...prev, rate]
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
            <h1 className="text-xl font-bold text-foreground">HSN Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage Harmonized System of Nomenclature codes and GST configurations
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
              onClick={() => router.push("/masters/hsn/add")}
            >
              <Plus className="w-3.5 h-3.5" /> Add HSN
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 bg-white border shadow-sm rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">
                {totalCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Total HSN Codes
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
              placeholder="Search HSN code, description..."
              className="h-8 text-xs"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length > 0 || filterCategory.length > 0 || filterGstRate.length > 0
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {(filterStatus.length > 0 || filterCategory.length > 0 || filterGstRate.length > 0) && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length + filterCategory.length + filterGstRate.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0 bg-white border shadow-lg border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter HSN</p>
              </div>
              <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GST Rate</p>
                  {gstRatesList.map(rate => (
                    <label key={rate} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterGstRate.includes(rate)}
                        onChange={() => toggleFilterGstRate(rate)}
                      />
                      <span className="text-xs text-foreground">{rate}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5 border-t border-border/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Applicable Category</p>
                  {["Seeds", "Fertilizers", "Pesticides", "Bio Products", "Equipment"].map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterCategory.includes(cat)}
                        onChange={() => toggleFilterCategory(cat)}
                      />
                      <span className="text-xs text-foreground">{cat}</span>
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
              {(filterStatus.length > 0 || filterCategory.length > 0 || filterGstRate.length > 0) && (
                <div className="px-3 py-2 border-t border-border bg-muted/10">
                  <button
                    onClick={() => {
                      setFilterStatus([]);
                      setFilterCategory([]);
                      setFilterGstRate([]);
                    }}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {filterGstRate.map(rate => (
            <span
              key={rate}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              GST: {rate}
              <button onClick={() => toggleFilterGstRate(rate)} className="hover:text-brand-800">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {filterCategory.map(cat => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              {cat}
              <button onClick={() => toggleFilterCategory(cat)} className="hover:text-brand-800">
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
                  <SortTh label="HSN ID" colKey="hsnId" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[120px] pl-4 py-3" />
                  <SortTh label="HSN Code" colKey="hsnCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[140px]" />
                  <SortTh label="HSN Description" colKey="hsnDescription" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="GST Rate" colKey="gstRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[120px]" />
                  <SortTh label="Applicable Category" colKey="applicableCategory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[180px]" />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-[130px]" />
                  <th className="sticky right-0 z-30 w-[80px] min-w-[80px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
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
                          <Code2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          No HSN configs found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {search || filterStatus.length > 0 || filterCategory.length > 0 || filterGstRate.length > 0
                            ? "Try adjusting your search or filters"
                            : "Add your first HSN configuration to get started"}
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
                      <td className="px-4 py-2.5 text-xs font-semibold font-mono text-brand-700 whitespace-nowrap">
                        {record.hsnId}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-bold text-foreground font-mono">
                        {record.hsnCode}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[300px] truncate">
                        {record.hsnDescription}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">
                        {record.gstRate}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">
                        {record.applicableCategory}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(record)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-0.5 py-0.5 transition-opacity focus:outline-none",
                            "hover:opacity-90",
                          )}
                          title="Click to toggle status"
                        >
                          <StatusBadge status={record.status} />
                        </button>
                      </td>
                      <td className="sticky right-0 z-20 w-[80px] min-w-[80px] px-3 py-2.5 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex items-center justify-center transition-colors rounded-md w-7 h-7 text-muted-foreground hover:bg-muted focus:outline-none">
                              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border shadow-lg border-border">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/masters/hsn/${record.id}/edit`)
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
              <span className="font-medium text-foreground">{totalCount}</span> HSN configs
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <Dialog
          open={true}
          onOpenChange={open => {
            if (!open) setConfirmDialog(null);
          }}
        >
          <DialogContent className="max-w-sm bg-white border shadow-xl border-border rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 border rounded-lg bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                {confirmDialog.record.status === "active" ? "Deactivate" : "Activate"} HSN Config?
              </DialogTitle>
              <DialogDescription className="pt-1">
                Are you sure you want to {confirmDialog.record.status === "active" ? "deactivate" : "activate"}{" "}
                "{confirmDialog.record.hsnCode}"?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
                onClick={confirmToggleStatus}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          )}
        >
          {toast.type === "success" ? (
            <Check className="flex-shrink-0 w-4 h-4" />
          ) : (
            <AlertTriangle className="flex-shrink-0 w-4 h-4" />
          )}
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
