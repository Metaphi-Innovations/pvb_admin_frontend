"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TDSMaster,
  loadTDSMasters,
  saveTDSMasters,
  todayStr,
} from "./tds-data";

export default function TDSPage() {
  const router = useRouter();
  const [records, setRecords] = useState<TDSMaster[]>(loadTDSMasters());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<"tdsCode" | "tdsRate" | "status">("tdsCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "toggle" | "delete";
    record: TDSMaster;
  } | null>(null);

  const filtered = useMemo(() => {
    let result = records.filter(r => r.status !== "archived");

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.tdsCode.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterStatus.length > 0) {
      result = result.filter(r => filterStatus.includes(r.status));
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, search, filterStatus, sortKey, sortDir]);

  const total = records.filter(r => r.status !== "archived").length;
  const active = records.filter(r => r.status === "active").length;
  const inactive = records.filter(r => r.status === "inactive").length;

  const toggleFilter = (status: string) => {
    setFilterStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSort = (key: "tdsCode" | "tdsRate" | "status") => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleToggleStatus = (record: TDSMaster) => {
    setConfirmDialog({ type: "toggle", record });
  };

  const confirmToggle = () => {
    if (!confirmDialog || confirmDialog.type !== "toggle") return;
    const updated: TDSMaster[] = records.map((r) =>
      r.id === confirmDialog.record.id
        ? {
            ...r,
            status: (r.status === "active" ? "inactive" : "active") as TDSMaster["status"],
            updatedBy: "Admin",
            updatedDate: todayStr(),
            lastStatusChange: todayStr(),
          }
        : r,
    );
    saveTDSMasters(updated);
    setRecords(updated);
    setConfirmDialog(null);
    setToast({ msg: "Status updated successfully", type: "success" });
    setTimeout(() => setToast(null), 3200);
  };

  const handleDelete = (record: TDSMaster) => {
    setConfirmDialog({ type: "delete", record });
  };

  const confirmDelete = () => {
    if (!confirmDialog || confirmDialog.type !== "delete") return;
    const updated: TDSMaster[] = records.map((r) =>
      r.id === confirmDialog.record.id
        ? { ...r, status: "archived" as const, updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    );
    saveTDSMasters(updated);
    setRecords(updated);
    setConfirmDialog(null);
    setToast({ msg: "TDS archived successfully", type: "success" });
    setTimeout(() => setToast(null), 3200);
  };

  const SortTh = ({
    label,
    colKey,
  }: {
    label: string;
    colKey: "tdsCode" | "tdsRate" | "status";
  }) => {
    const active = sortKey === colKey;
    return (
      <th
        onClick={() => handleSort(colKey)}
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
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">TDS Master</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage Tax Deducted at Source rates and configurations
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => router.push("/masters/tds/add")}
          >
            <Plus className="w-3.5 h-3.5" /> Add TDS
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">∑</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total TDS</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">✓</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{active}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Active</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-400 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">○</span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{inactive}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Inactive</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-[10px] text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search TDS Code..."
              className="pl-9 h-8 text-xs rounded-lg"
            />
          </div>

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
                <p className="text-xs font-semibold text-foreground">Filter by Status</p>
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
                      onChange={() => toggleFilter(v)}
                    />
                    <span className="text-xs capitalize text-foreground">{v}</span>
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
              <button onClick={() => toggleFilter(v)}>
                <span className="w-3 h-3">×</span>
              </button>
            </span>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 bg-white rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {records.length === 0 ? "No TDS found" : "No TDS match filters"}
            </p>
            <p className="text-xs text-muted-foreground">
              {records.length === 0
                ? "Add your first TDS rate to get started."
                : "Try adjusting your search or filters."}
            </p>
            {filterStatus.length > 0 && (
              <button
                onClick={() => setFilterStatus([])}
                className="text-xs text-brand-600 hover:underline mt-1"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-32" />
                  <col />
                  <col className="w-44" />
                  <col className="w-12" />
                </colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <SortTh label="TDS Code" colKey="tdsCode" />
                    <SortTh label="TDS Rate (%)" colKey="tdsRate" />
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                      Remarks
                    </th>
                    <SortTh label="Status" colKey="status" />
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-foreground w-12">
                      —
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(record => (
                    <tr
                      key={record.id}
                      className="border-b border-border/60 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs font-semibold text-brand-700">
                          {record.tdsCode}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-foreground">
                        {record.tdsRate}%
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {record.remarks || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
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
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
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
                            <button
                              onClick={() => router.push(`/masters/tds/${record.id}/edit`)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <DropdownMenuSeparator />
                            <button
                              onClick={() => handleDelete(record)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[11px] text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                <span className="font-medium text-foreground">{total}</span> records
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    confirmDialog.type === "delete"
                      ? "bg-red-50 border border-red-200"
                      : "bg-amber-50 border border-amber-200"
                  )}
                >
                  <AlertCircle
                    className={cn(
                      "w-4 h-4",
                      confirmDialog.type === "delete"
                        ? "text-red-500"
                        : "text-amber-500"
                    )}
                  />
                </div>
                {confirmDialog.type === "delete"
                  ? "Delete TDS"
                  : "Change Status"}
              </DialogTitle>
              <DialogDescription className="pt-1">
                {confirmDialog.type === "delete"
                  ? `Archive TDS ${confirmDialog.record.tdsCode}? This cannot be undone.`
                  : `Change status of TDS ${confirmDialog.record.tdsCode} to ${
                      confirmDialog.record.status === "active" ? "Inactive" : "Active"
                    }?`}
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
                  confirmDialog.type === "delete" ? confirmDelete : confirmToggle
                }
              >
                {confirmDialog.type === "delete" ? "Delete" : "Update"}
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
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
