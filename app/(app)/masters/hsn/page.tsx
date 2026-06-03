"use client";

import React, { useEffect, useState } from "react";
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
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Code2,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Edit2,
  Trash2,
  MoreVertical,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  HSNMaster,
  loadHSNMasters,
  saveHSNMasters,
  todayStr,
} from "./hsn-data";

export default function HSNPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HSNMaster[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<"code" | "rate" | "status">("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "toggle" | "delete";
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

  const filtered = records
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.hsnCode.toLowerCase().includes(q);
    })
    .filter(r => {
      if (filterStatus.length === 0) return true;
      return filterStatus.includes(r.status);
    })
    .sort((a, b) => {
      let aVal: any = a[sortKey as keyof HSNMaster];
      let bVal: any = b[sortKey as keyof HSNMaster];
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
            lastStatusChange: todayStr(),
          }
        : r
    ) as HSNMaster[];
    setRecords(updated);
    saveHSNMasters(updated);
    setToast({
      msg: `HSN code ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      type: "success",
    });
    setConfirmDialog(null);
  };

  const handleDeleteClick = (record: HSNMaster) => {
    setConfirmDialog({ type: "delete", record });
  };

  const confirmDelete = () => {
    const record = confirmDialog?.record;
    if (!record) return;
    const updated = records.filter(r => r.id !== record.id);
    setRecords(updated);
    saveHSNMasters(updated);
    setToast({ msg: "HSN code deleted successfully", type: "success" });
    setConfirmDialog(null);
  };

  const toggleFilterStatus = (status: string) => {
    setFilterStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSort = (key: "code" | "rate" | "status") => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">HSN</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage Harmonized System of Nomenclature codes and GST rates
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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
              <Plus className="w-3.5 h-3.5" /> Add HSN Code
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">
                {totalCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Total HSN Codes
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">
                {activeCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Active
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">
                {inactiveCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Inactive
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by HSN code…"
            className="h-8 text-xs rounded-lg flex-1 min-w-64"
          />

          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length > 0
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {filterStatus.length > 0 && (
                  <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                    {filterStatus.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-0">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-xs font-semibold text-foreground">
                  Filter by Status
                </p>
              </div>
              <div className="px-3 py-2.5 space-y-2">
                {["active", "inactive"].map(v => (
                  <label
                    key={v}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-brand-600"
                      checked={filterStatus.includes(v)}
                      onChange={() => toggleFilterStatus(v)}
                    />
                    <span className="text-xs capitalize text-foreground">
                      {v}
                    </span>
                  </label>
                ))}
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button
                    onClick={() => setFilterStatus([])}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {filterStatus.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
              <button
                onClick={() => toggleFilterStatus(v)}
                className="hover:text-brand-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Table */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-28" />
                <col />
                <col className="w-44" />
                <col className="w-12" />
              </colgroup>
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh
                    label="HSN Code"
                    colKey="code"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortTh
                    label="GST Rate (%)"
                    colKey="rate"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                    UOM
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                    Remarks
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">
                    Status
                  </th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Code2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          No HSN codes found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {search || filterStatus.length > 0
                            ? "Try adjusting your search or filters"
                            : "Add your first HSN code to get started"}
                        </p>
                        {(search || filterStatus.length > 0) && (
                          <button
                            onClick={() => {
                              setSearch("");
                              setFilterStatus([]);
                            }}
                            className="text-xs text-brand-600 hover:underline mt-1"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => (
                    <tr
                      key={record.id}
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-2 text-xs font-semibold font-mono text-brand-700 whitespace-nowrap">
                        {record.hsnCode}
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold text-foreground whitespace-nowrap">
                        {record.gstRate}%
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {record.uom || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-40">
                        {record.remarks || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleToggleStatus(record)}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg transition-colors bg-muted/50 hover:bg-muted"
                        >
                          <span
                            className={cn(
                              "text-xs font-medium",
                              record.status === "active"
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {record.status === "active" ? "Active" : "Inactive"}
                          </span>
                          <Switch
                            checked={record.status === "active"}
                            onCheckedChange={() => handleToggleStatus(record)}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/masters/hsn/${record.id}/edit`)
                              }
                              className="flex items-center gap-2 cursor-pointer text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(record)}
                              className="flex items-center gap-2 cursor-pointer text-xs text-red-600"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> HSN codes
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
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    confirmDialog.type === "delete"
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "w-4 h-4",
                      confirmDialog.type === "delete"
                        ? "text-red-500"
                        : "text-amber-500"
                    )}
                  />
                </div>
                {confirmDialog.type === "delete"
                  ? "Delete HSN Code?"
                  : `${
                      confirmDialog.record.status === "active"
                        ? "Deactivate"
                        : "Activate"
                    } HSN Code?`}
              </DialogTitle>
              <DialogDescription className="pt-1">
                {confirmDialog.type === "delete"
                  ? `Are you sure you want to delete "${confirmDialog.record.hsnCode}"? This action cannot be undone.`
                  : `Are you sure you want to ${
                      confirmDialog.record.status === "active"
                        ? "deactivate"
                        : "activate"
                    } "${confirmDialog.record.hsnCode}"?`}
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
                className={cn(
                  "h-8 text-xs gap-1.5",
                  confirmDialog.type === "delete"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-brand-600 hover:bg-brand-700 text-white"
                )}
                onClick={
                  confirmDialog.type === "delete"
                    ? confirmDelete
                    : confirmToggleStatus
                }
              >
                {confirmDialog.type === "delete" ? "Delete" : "Confirm"}
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
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
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
}: {
  label: string;
  colKey: "code" | "rate" | "status";
  sortKey: string;
  sortDir: string;
  onSort: (key: "code" | "rate" | "status") => void;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60"
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
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
    </th>
  );
}
