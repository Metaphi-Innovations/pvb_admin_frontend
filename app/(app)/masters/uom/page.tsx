"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MasterFormGrid } from "@/components/masters/MasterModule";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

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

interface UOMForm {
  unitName: string;
  shortName: string;
  uom: string;
  conversionUnit: string;
  status: "active" | "inactive";
}

const DEFAULT_UOM_FORM: UOMForm = {
  unitName: "",
  shortName: "",
  uom: "",
  conversionUnit: "1",
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
  const [sort, setSort] = useState<SortState>({ key: "unitName", direction: "asc" });
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
      key: "uom",
      header: "UOM",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "160px",
      render: (val, row) => row.uom || "—",
    },
    {
      key: "conversionUnit",
      header: "Conversion Unit",
      sortable: true,
      width: "140px",
      render: (val, row) => row.conversionUnit ?? 1,
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
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
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
        <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />
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
        <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />
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
      uom: row.uom || "",
      conversionUnit: row.conversionUnit !== undefined ? String(row.conversionUnit) : "1",
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
        uom: form.uom,
        conversionUnit: parseFloat(form.conversionUnit) || 1,
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
              uom: form.uom,
              conversionUnit: parseFloat(form.conversionUnit) || 1,
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
      const headers = ["ID", "Unit Name", "Short Name", "UOM", "Conversion Unit", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.unitName.replace(/"/g, '""')}"`,
          `"${r.shortName.replace(/"/g, '""')}"`,
          `"${(r.uom || "").replace(/"/g, '""')}"`,
          `"${r.conversionUnit ?? 1}"`,
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
          searchPlaceholder="Search unit name, short name..."
          currentFilters={filters}
          currentSort={sort}
        />
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
            ? buildSimpleMasterViewDrawer<UOMMaster>({
                drawerTitle: "Unit",
                getRecordCode: (r) => r.unitName,
                basicInfo: (r) => [
                  { label: "Unit Name", value: r.unitName },
                  { label: "Short Name", value: r.shortName },
                  { label: "UOM", value: r.uom || "—" },
                  { label: "Conversion Unit", value: String(r.conversionUnit ?? 1) },
                ],
                showDescription: false,
              })(active)
            : { title: "Unit", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
            <MasterFormGrid>
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
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">UOM</Label>
                <AutocompleteSelect
                  options={records
                    .filter((r) => r.id !== active?.id && r.status === "active")
                    .map((r) => ({ label: r.unitName, value: r.unitName }))}
                  value={form.uom}
                  onChange={(val) => setForm((prev) => ({ ...prev, uom: val }))}
                  placeholder="Select UOM"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Conversion Unit</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.conversionUnit}
                  onChange={(e) => setForm((prev) => ({ ...prev, conversionUnit: e.target.value }))}
                  placeholder="e.g., 1000"
                  className="h-8 text-xs"
                />
              </div>
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
