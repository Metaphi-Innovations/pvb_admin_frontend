"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Folder,
  X,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadCrops, saveCrops, type Crop, type CropStatus, todayStr, nextCropId, FIELD_TYPES, SEASONS } from "./crop-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { CropForm, DEFAULT_CROP_FORM, type CropFormValues, validateCropForm } from "./components/CropForm";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

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
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export default function CropMasterPage() {
  const [records, setRecords] = useState<Crop[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "cropName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<Crop | null>(null);
  const [form, setForm] = useState<CropFormValues>(DEFAULT_CROP_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Crop | null>(null);

  useEffect(() => {
    setRecords(loadCrops());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: Crop) => {
    const nextStatus: CropStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : item,
    );
    setRecords(updated);
    saveCrops(updated);
    setToast({ msg: `Crop status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  const columns: ColumnConfig<Crop>[] = [
    {
      key: "cropName",
      header: "Crop Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.cropName}</span>
      ),
    },
    {
      key: "fieldType",
      header: "Field Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: FIELD_TYPES.map(ft => ({ label: ft, value: ft })),
      width: "180px",
    },
    {
      key: "categoryName",
      header: "Category",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "180px",
    },
    {
      key: "season",
      header: "Season/Period",
      sortable: false,
      filterable: true,
      filterType: "dropdown",
      filterOptions: SEASONS.map(s => ({ label: s, value: s })),
      width: "220px",
      render: (val, row) => (
        <span className="text-xs text-foreground truncate max-w-[210px] block">
          {Array.isArray(row.season) ? row.season.join(", ") : ""}
        </span>
      ),
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
      width: "110px",
      render: (val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
      ),
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />,
    },
    {
      key: "updatedDate",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />,
    },
  ];

  const actions: ActionItemConfig<Crop>[] = [
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
          r.cropName.toLowerCase().includes(q) ||
          r.fieldType.toLowerCase().includes(q) ||
          r.categoryName.toLowerCase().includes(q) ||
          r.season.some(s => s.toLowerCase().includes(q))
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Filter by season specifically if it's in columns filter (which uses multi select or dropdown option)
    if (filters.season && Array.isArray(filters.season) && filters.season.length > 0) {
      result = result.filter((r) =>
        r.season.some((s) => (filters.season as string[]).includes(s))
      );
    }

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let aVal = "";
        let bVal = "";
        
        if (sort.key === "season") {
          aVal = (a.season || []).join(", ").toLowerCase();
          bVal = (b.season || []).join(", ").toLowerCase();
        } else {
          aVal = String(a[sort.key as keyof Crop] || "").toLowerCase();
          bVal = String(b[sort.key as keyof Crop] || "").toLowerCase();
        }

        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const openAdd = () => {
    setForm(DEFAULT_CROP_FORM);
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: Crop) => {
    setForm({
      cropName: row.cropName,
      fieldType: row.fieldType,
      categoryName: row.categoryName,
      season: row.season,
      status: row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: Crop) => {
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
    const errs = validateCropForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const list = loadCrops();
    let updatedList: Crop[];
    if (mode === "add") {
      const id = nextCropId(list);
      const newRecord: Crop = {
        id,
        cropName: form.cropName.trim(),
        fieldType: form.fieldType,
        categoryName: form.categoryName,
        season: form.season,
        status: form.status,
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
      };
      updatedList = [...list, newRecord];
      setToast({ msg: "Crop added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id
          ? {
              ...r,
              cropName: form.cropName.trim(),
              fieldType: form.fieldType,
              categoryName: form.categoryName,
              season: form.season,
              status: form.status,
              updatedBy: "Admin",
              updatedDate: todayStr(),
            }
          : r,
      );
      setToast({ msg: "Crop updated successfully", type: "success" });
    } else {
      return;
    }
    saveCrops(updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadCrops().filter((r) => r.id !== deleteTarget.id);
    saveCrops(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Crop deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Crop Name", "Field Type", "Category Name", "Season/Period", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.cropName.replace(/"/g, '""')}"`,
          `"${r.fieldType.replace(/"/g, '""')}"`,
          `"${r.categoryName.replace(/"/g, '""')}"`,
          `"${r.season.join(", ").replace(/"/g, '""')}"`,
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
      link.setAttribute("download", `crops_export_${todayStr()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Crops exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export crops", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Crop"
      : sheetMode === "edit"
      ? "Edit Crop"
      : "View Crop";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Crop Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage crops, their field classifications, categories, and seasons</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Crops" value={records.length} icon={Folder} accent={true} />
          <MiniKPICard label="Active" value={records.filter((r) => r.status === "active").length} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={records.filter((r) => r.status === "inactive").length} icon={XCircle} accent={false} />
        </div>

        <MasterListing<Crop>
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
          addLabel="Add Crop"
          onExport={handleExport}
          emptyMessage="crops"
          searchPlaceholder="Search crop name, field type, category, season..."
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
        icon={Folder}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<Crop>({
                drawerTitle: "Crop",
                getRecordCode: () => "",
                basicInfo: (r) => [
                  { label: "Crop Name", value: r.cropName },
                  { label: "Field Type", value: r.fieldType },
                  { label: "Category", value: r.categoryName },
                  { label: "Season / Period", value: r.season.join(", ") },
                ],
                description: () => "",
                showDescription: false,
              })(active)
            : { title: "Crop", basicInfo: [] }
        }
        formContent={
          <CropForm
            form={form}
            onChange={setForm}
            errors={errors}
            onClearError={(key) =>
              setErrors((prev) => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
              })
            }
          />
        }
        statusActive={form.status === "active"}
        onStatusChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
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
