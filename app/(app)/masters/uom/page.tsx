"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Ruler,
  CheckCircle2,
  XCircle,
  X,
  Edit2,
  Eye,
  Trash2,
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

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";

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
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "uomId", direction: "asc" });
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

  const columns: ColumnConfig<UOMMaster>[] = [
    {
      key: "uomId",
      header: "Unit ID",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (val, row) => (
        <span className="font-mono text-xs text-brand-700">{row.uomId}</span>
      ),
    },
    {
      key: "unitName",
      header: "Unit Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.unitName}</span>
      ),
    },
    {
      key: "shortName",
      header: "Short Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      width: "100px",
      render: (val, row) => (
        <StatusToggle record={row} onToggle={toggleStatus} />
      ),
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <div>
          <p className="text-[11px] font-semibold leading-4 text-brand-700">{row.createdBy}</p>
          <p className="text-[10px] font-mono leading-3 text-muted-foreground">{row.createdDate}</p>
        </div>
      ),
    },
    {
      key: "updatedDate",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <div>
          <p className="text-[11px] font-semibold leading-4 text-brand-700">{row.updatedBy}</p>
          <p className="text-[10px] font-mono leading-3 text-muted-foreground">{row.updatedDate}</p>
        </div>
      ),
    },
  ];

  const actions: ActionItemConfig<UOMMaster>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => openView(row),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => openEdit(row),
    },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const filtered = useMemo(() => {
    let result = [...records];

    // Search filter
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.uomId.toLowerCase().includes(q) ||
          r.unitName.toLowerCase().includes(q) ||
          r.shortName.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof UOMMaster] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof UOMMaster] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

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
        <div>
          <h1 className="text-xl font-bold text-foreground">Unit Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage units of measure used across products</p>
        </div>

        {/* <div className="grid grid-cols-3 gap-3">
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
        </div> */}

        <MasterListing<UOMMaster>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          actions={actions}
          onAdd={openAdd}
          addLabel="Add Unit"
          onExport={handleExport}
          emptyMessage="units"
          searchPlaceholder="Search Unit ID, Name, Short Name..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="flex items-center justify-center border w-9 h-9 rounded-xl bg-brand-50 border-brand-100">
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
                <div className="px-3 border rounded-lg border-border/60 bg-muted/10">
                  <MasterViewRow label="Unit Name" value={active.unitName} />
                  <MasterViewRow label="Unit ID" value={<span className="font-mono">{active.uomId}</span>} />
                  <MasterViewRow label="Short Name" value={active.shortName} />
                  <MasterViewRow label="Status" value={active.status === "active" ? "Active" : "Inactive"} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t">
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
                      className="h-8 text-xs cursor-not-allowed bg-muted/30 text-muted-foreground"
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
                {/* <div className="flex items-center justify-between p-3 border rounded-lg border-border bg-muted/20">
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
                </div> */}
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
                  className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
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
                  className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
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
