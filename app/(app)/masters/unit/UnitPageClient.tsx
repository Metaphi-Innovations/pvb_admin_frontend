"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Edit2,
  Eye,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Ruler,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import {
  DEFAULT_UNIT_FORM,
  formToUnit,
  UNIT_SEED,
  UNIT_STORAGE_KEY,
  unitToForm,
  type UnitForm,
  type UnitRecord,
  validateUnitForm,
} from "./unit-data";
import {
  loadMasterRecords,
  saveMasterRecords,
  nextMasterCode,
  masterToday,
  MASTER_CURRENT_USER,
  type MasterStatus,
} from "@/lib/masters/common";

type SortKey = "unitCode" | "unitName" | "symbol" | "description" | "status" | "createdBy" | "updatedBy";

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
      <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StatusToggle({ record, onToggle }: { record: UnitRecord; onToggle: (item: UnitRecord) => void }) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={(e) => {
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

export default function UnitMasterPage() {
  const [records, setRecords] = useState<UnitRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("unitCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<UnitRecord | null>(null);
  const [form, setForm] = useState<UnitForm>(DEFAULT_UNIT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<UnitRecord | null>(null);

  useEffect(() => {
    setRecords(loadMasterRecords<UnitRecord>(UNIT_STORAGE_KEY, UNIT_SEED));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
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

  const toggleStatus = (record: UnitRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: MASTER_CURRENT_USER, updatedAt: masterToday() }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(UNIT_STORAGE_KEY, updated);
    setToast({
      msg: `Unit status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const openAdd = () => {
    const codes = records.map((r) => r.unitCode);
    const code = nextMasterCode("UNIT-", codes);
    setForm({
      ...DEFAULT_UNIT_FORM,
      unitCode: code,
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: UnitRecord) => {
    setForm(unitToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: UnitRecord) => {
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
    const err = validateUnitForm(form);
    if (err) {
      setErrors({ _form: err });
      return;
    }
    const list = loadMasterRecords<UnitRecord>(UNIT_STORAGE_KEY, UNIT_SEED);
    let updatedList: UnitRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToUnit(form, id)];
      setToast({ msg: "Unit added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) => (r.id === active.id ? formToUnit(form, active.id, active) : r));
      setToast({ msg: "Unit updated successfully", type: "success" });
    } else {
      return;
    }
    saveMasterRecords(UNIT_STORAGE_KEY, updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadMasterRecords<UnitRecord>(UNIT_STORAGE_KEY, UNIT_SEED).filter(
      (r) => r.id !== deleteTarget.id,
    );
    saveMasterRecords(UNIT_STORAGE_KEY, list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Unit deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Unit Code", "Unit Name", "Symbol", "Description", "Status", "Created By", "Updated By", "Created At", "Updated At"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.unitCode.replace(/"/g, '""')}"`,
          `"${r.unitName.replace(/"/g, '""')}"`,
          `"${r.symbol.replace(/"/g, '""')}"`,
          `"${(r.description || "").replace(/"/g, '""')}"`,
          r.status,
          r.createdBy,
          r.updatedBy,
          r.createdAt,
          r.updatedAt,
        ];
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `units_export_${masterToday()}.csv`);
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
          r.unitCode.toLowerCase().includes(q) ||
          r.unitName.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
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

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Unit Master</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Units of measure for products</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-border bg-white text-xs text-foreground hover:bg-muted"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
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
            <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search unit code, name, symbol..."
              className="h-8 text-xs pl-9"
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
                <p className="text-xs font-semibold text-foreground">Filter Unit</p>
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

        <div className="overflow-hidden bg-white border shadow-sm rounded-xl border-border">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-fixed w-max">
              <thead>
                <tr className="border-b bg-muted/40 border-border">
                  <SortTh
                    label="Unit Code"
                    colKey="unitCode"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[120px] pl-4 py-3"
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
                    label="Symbol"
                    colKey="symbol"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[120px]"
                  />
                  <SortTh
                    label="Description"
                    colKey="description"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[320px]"
                  />
                  <SortTh
                    label="Created By"
                    colKey="createdBy"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    className="w-[130px]"
                  />
                  <SortTh
                    label="Updated By"
                    colKey="updatedBy"
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
                    className="w-[110px]"
                  />
                  <th className="sticky right-0 z-30 w-[80px] min-w-[80px] h-11 px-3 text-left text-[13px] font-semibold whitespace-nowrap bg-white border-l border-border shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-xs text-center text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginated.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => openView(row)}
                      className="align-top transition-colors border-b cursor-pointer border-border/60 hover:bg-muted/20 group"
                    >
                      <td className="px-4 py-2.5 text-xs font-semibold font-mono text-brand-700 whitespace-nowrap">
                        {row.unitCode}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-foreground">
                        {row.unitName}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold font-mono text-foreground">
                        {row.symbol}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap font-medium">
                        {row.description || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {row.createdBy}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {row.updatedBy}
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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
                              className="inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:bg-muted"
                            >
                              <MoreVertical className="w-4 h-4" />
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
                              className="flex items-center gap-2 text-red-600 cursor-pointer focus:text-red-700"
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

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Ruler}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<UnitRecord>({
                drawerTitle: "Unit",
                getRecordCode: (r) => r.unitCode,
                basicInfo: (r) => [
                  { label: "Unit Name", value: r.unitName },
                  { label: "Unit Code", value: r.unitCode, mono: true },
                  { label: "Symbol", value: r.symbol, mono: true },
                ],
                description: (r) => r.description,
                showDescription: true,
              })(active)
            : { title: "Unit", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
            <MasterFormGrid>
              <MasterField label="Unit Name" required>
                <Input
                  className={compactInput()}
                  value={form.unitName}
                  onChange={(e) => setForm((f) => ({ ...f, unitName: e.target.value }))}
                />
              </MasterField>
              <MasterField label="Unit Code" required>
                <Input
                  className={compactInput("font-mono opacity-100 bg-background text-foreground cursor-not-allowed")}
                  value={form.unitCode}
                  disabled
                  readOnly
                  onChange={(e) => setForm((f) => ({ ...f, unitCode: e.target.value.toUpperCase() }))}
                />
              </MasterField>
              <MasterField label="Symbol" required>
                <Input
                  className={compactInput("font-mono")}
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  placeholder="KG, L, PKT"
                />
              </MasterField>
              <MasterField label="Description" className="sm:col-span-2">
                <Textarea
                  className="text-xs min-h-[72px] resize-none"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </MasterField>
            </MasterFormGrid>
          </div>
        }
      />

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
            <Button size="sm" className="h-8 text-xs text-white bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
