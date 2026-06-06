"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Ruler,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Edit2,
  Eye,
  MoreVertical,
  SlidersHorizontal,
  X,
  ChevronsUpDown,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Search,
} from "lucide-react";
import {
  UOMMaster,
  loadUOMMasters,
  saveUOMMasters,
  todayStr,
  nextUOMId,
  generateUOMCode,
} from "./uom-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterFormGrid, MasterViewRow } from "@/components/masters/MasterModule";

type SortKey = "uomId" | "unitName" | "shortName" | "status";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StatusToggle({ record, onToggle }: { record: UOMMaster; onToggle: (item: UOMMaster) => void }) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(record);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

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
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-3 py-3 text-left text-[13px] font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
      </div>
    </th>
  );
}

interface UOMForm {
  unitName: string;
  shortName: string;
  status: "active" | "inactive";
}

const DEFAULT_UOM_FORM: UOMForm = {
  unitName: "",
  shortName: "",
  status: "active",
};

function validateUOMForm(form: UOMForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.unitName.trim()) e.unitName = "Unit Name is required";
  if (!form.shortName.trim()) e.shortName = "Unit Short Name is required";
  return e;
}

export default function UOMPage() {
  const [records, setRecords] = useState<UOMMaster[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("uomId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<UOMMaster | null>(null);
  const [form, setForm] = useState<UOMForm>(DEFAULT_UOM_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<UOMMaster | null>(null);

  useEffect(() => {
    setRecords(loadUOMMasters());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, sortKey, sortDir, pageSize]);

  const toggleStatus = (record: UOMMaster) => {
    const nextStatus: "active" | "inactive" = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : item,
    );
    setRecords(updated);
    saveUOMMasters(updated);
    setToast({
      msg: `Unit status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const openAdd = () => {
    setForm(DEFAULT_UOM_FORM);
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: UOMMaster) => {
    setForm({
      unitName: row.unitName,
      shortName: row.shortName,
      status: row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: UOMMaster) => {
    setActive(row);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
  };

  const persist = () => {
    const mode = sheetMode === "add" ? "add" : "edit";
    const errs = validateUOMForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const list = loadUOMMasters();
    let updatedList: UOMMaster[];
    if (mode === "add") {
      const nextIdVal = nextUOMId(list);
      const newRecord: UOMMaster = {
        id: nextIdVal,
        uomId: generateUOMCode(nextIdVal),
        unitName: form.unitName.trim(),
        shortName: form.shortName.trim(),
        status: form.status,
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
      };
      updatedList = [...list, newRecord];
      setToast({ msg: "Unit added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id
          ? {
              ...r,
              unitName: form.unitName.trim(),
              shortName: form.shortName.trim(),
              status: form.status,
              updatedBy: "Admin",
              updatedDate: todayStr(),
            }
          : r,
      );
      setToast({ msg: "Unit updated successfully", type: "success" });
    } else {
      return;
    }
    saveUOMMasters(updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadUOMMasters().filter((r) => r.id !== deleteTarget.id);
    saveUOMMasters(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Unit deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Unit ID", "Unit Name", "Short Name", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.uomId.replace(/"/g, '""')}"`,
          `"${r.unitName.replace(/"/g, '""')}"`,
          `"${r.shortName.replace(/"/g, '""')}"`,
          r.status,
          r.createdBy,
          r.createdDate,
          r.updatedBy,
          r.updatedDate,
        ];
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `uom_export_${todayStr()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Units exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export units", type: "error" });
    }
  };

  const filtered = useMemo(() => {
    return records
      .filter((r) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          r.uomId.toLowerCase().includes(q) ||
          r.unitName.toLowerCase().includes(q) ||
          r.shortName.toLowerCase().includes(q)
        );
      })
      .filter((r) => (filterStatus.length ? filterStatus.includes(r.status) : true))
      .sort((a, b) => {
        const aVal = String(a[sortKey] ?? "").toLowerCase();
        const bVal = String(b[sortKey] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, filterStatus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const start = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filtered.length);

  const sheetTitle =
    sheetMode === "add"
      ? "Add Unit"
      : sheetMode === "edit"
      ? "Edit Unit"
      : "View Unit";

  const nextAutoCode = generateUOMCode(nextUOMId(records));

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Unit Master</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Manage units of measure used across products</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border bg-white text-foreground hover:bg-muted text-xs"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand-600 text-white hover:bg-brand-700 text-xs"
              onClick={openAdd}
            >
              <Plus className="h-3.5 w-3.5" /> Add Unit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Units" value={records.length} icon={Ruler} accent={true} />
          <MiniKPICard
            label="Active"
            value={records.filter((r) => r.status === "active").length}
            icon={CheckCircle2}
            accent={false}
          />
          <MiniKPICard
            label="Inactive"
            value={records.filter((r) => r.status === "inactive").length}
            icon={XCircle}
            accent={false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Unit ID, Name, Short Name..."
              className="h-8 pl-9 text-xs"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
                  filterStatus.length > 0 ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
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
            <PopoverContent align="start" className="w-56 p-0 bg-white border shadow-lg border-border">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Filter Units</p>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-1.5 border-t-0 pt-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                  {["active", "inactive"].map((v) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={filterStatus.includes(v)}
                        onChange={() => {
                          setFilterStatus((prev) =>
                            prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v],
                          );
                        }}
                      />
                      <span className="text-xs capitalize text-foreground">{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              {filterStatus.length > 0 && (
                <div className="px-3 py-2 border-t border-border bg-muted/10">
                  <button
                    onClick={() => setFilterStatus([])}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed w-max">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <SortTh
                    label="Unit ID"
                    colKey="uomId"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[110px] pl-4 py-3"
                  />
                  <SortTh
                    label="Unit Name"
                    colKey="unitName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[220px]"
                  />
                  <SortTh
                    label="Short Name"
                    colKey="shortName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[130px]"
                  />
                  <SortTh
                    label="Status"
                    colKey="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[100px]"
                  />
                  <th className="sticky right-0 z-30 w-[80px] min-w-[80px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => openView(row)}
                      className="align-top transition-colors border-b border-border/60 hover:bg-muted/20 group cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-xs font-semibold font-mono text-brand-700 whitespace-nowrap">
                        {row.uomId}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-foreground">
                        {row.unitName}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">
                        {row.shortName}
                      </td>
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <StatusToggle record={row} onToggle={toggleStatus} />
                      </td>
                      <td
                        className="sticky right-0 z-20 w-[80px] min-w-[80px] px-3 py-2.5 bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 bg-white border shadow-lg border-border">
                            <DropdownMenuItem
                              onClick={() => openView(row)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEdit(row)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(row)}
                              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
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
              {filtered.length === 0 ? (
                "No records"
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{start}-{end}</span> of{" "}
                  <span className="font-medium text-foreground">{filtered.length}</span> units
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 text-xs bg-white border rounded-md h-7 border-border text-foreground"
              >
                {[10, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} / page
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="flex items-center justify-center text-xs border rounded-md w-7 h-7 border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-2 min-w-[48px] text-center">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center text-xs border rounded-md w-7 h-7 border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Ruler className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                <SheetDescription className="text-xs">
                  {sheetMode === "view" ? "Read-only details" : "Compact unit form"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody>
            {sheetMode === "view" && active ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
                  <MasterViewRow label="Unit Name" value={active.unitName} />
                  <MasterViewRow label="Unit ID" value={<span className="font-mono">{active.uomId}</span>} />
                  <MasterViewRow label="Short Name" value={active.shortName} />
                  <MasterViewRow label="Status" value={active.status === "active" ? "Active" : "Inactive"} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Created By</p>
                    <p className="font-medium">{active.createdBy}</p>
                    <p className="text-muted-foreground">{active.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Updated By</p>
                    <p className="font-medium">{active.updatedBy}</p>
                    <p className="text-muted-foreground">{active.updatedDate}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
                <MasterFormGrid>
                  {/* Unit ID (Auto) */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium">Unit ID</Label>
                    <Input
                      value={sheetMode === "add" ? nextAutoCode : active?.uomId || ""}
                      disabled
                      className="h-8 text-xs bg-muted/30 text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  {/* Unit Name */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium">
                      Unit Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.unitName}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, unitName: e.target.value }));
                        setErrors((prev) => ({ ...prev, unitName: "" }));
                      }}
                      placeholder="e.g., Kilogram"
                      className={cn("h-8 text-xs", errors.unitName && "border-red-400 focus-visible:ring-red-300")}
                    />
                    {errors.unitName && <p className="text-[11px] text-red-500 mt-1">{errors.unitName}</p>}
                  </div>

                  {/* Unit Short Name */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium">
                      Short Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.shortName}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, shortName: e.target.value }));
                        setErrors((prev) => ({ ...prev, shortName: "" }));
                      }}
                      placeholder="e.g., KG"
                      className={cn("h-8 text-xs", errors.shortName && "border-red-400 focus-visible:ring-red-300")}
                    />
                    {errors.shortName && <p className="text-[11px] text-red-500 mt-1">{errors.shortName}</p>}
                  </div>
                </MasterFormGrid>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div>
                    <p className="text-xs font-medium">Status</p>
                    <p className="text-[11px] text-muted-foreground">{form.status === "active" ? "Active" : "Inactive"}</p>
                  </div>
                  <Switch
                    checked={form.status === "active"}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, status: checked ? "active" : "inactive" }))
                    }
                  />
                </div>
              </div>
            )}
          </SheetBody>

          <SheetFooter>
            {sheetMode === "view" ? (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeSheet}>
                  Back
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={() => active && openEdit(active)}
                >
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeSheet}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={persist}
                >
                  Save
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete record?</DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. The record will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
