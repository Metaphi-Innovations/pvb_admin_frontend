"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Microscope,
  XCircle,
  X,
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
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterFormGrid } from "@/components/masters/MasterModule";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  DEFAULT_CFU_FORM,
  formToCfu,
  CFU_SEED,
  CFU_STORAGE_KEY,
  cfuToForm,
  type CfuForm,
  type CfuRecord,
  validateCfuForm,
} from "./cfu-data";
import {
  loadMasterRecords,
  saveMasterRecords,
  nextMasterCode,
  masterToday,
  MASTER_CURRENT_USER,
  type MasterStatus,
} from "@/lib/masters/common";

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
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StatusToggle({ record, onToggle }: { record: CfuRecord; onToggle: (item: CfuRecord) => void }) {
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

export default function CfuMasterPage() {
  const [records, setRecords] = useState<CfuRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "cfuCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<CfuRecord | null>(null);
  const [form, setForm] = useState<CfuForm>(DEFAULT_CFU_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<CfuRecord | null>(null);

  useEffect(() => {
    setRecords(loadMasterRecords<CfuRecord>(CFU_STORAGE_KEY, CFU_SEED));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: CfuRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: MASTER_CURRENT_USER, updatedAt: masterToday() }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(CFU_STORAGE_KEY, updated);
    setToast({
      msg: `CFU status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const columns: ColumnConfig<CfuRecord>[] = [
    {
      key: "cfuCode",
      header: "CFU Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
    },
    {
      key: "cfuName",
      header: "CFU Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "320px",
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
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
  ];

  const actions: ActionItemConfig<CfuRecord>[] = [
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
          r.cfuCode.toLowerCase().includes(q) ||
          r.cfuName.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof CfuRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof CfuRecord] ?? "").toLowerCase();
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
    const codes = records.map((r) => r.cfuCode);
    const code = nextMasterCode("CFU-", codes);
    setForm({
      ...DEFAULT_CFU_FORM,
      cfuCode: code,
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: CfuRecord) => {
    setForm(cfuToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: CfuRecord) => {
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
    const err = validateCfuForm(form);
    if (err) {
      setErrors({ _form: err });
      return;
    }
    const list = loadMasterRecords<CfuRecord>(CFU_STORAGE_KEY, CFU_SEED);
    let updatedList: CfuRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToCfu(form, id)];
      setToast({ msg: "CFU added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) => (r.id === active.id ? formToCfu(form, active.id, active) : r));
      setToast({ msg: "CFU updated successfully", type: "success" });
    } else {
      return;
    }
    saveMasterRecords(CFU_STORAGE_KEY, updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadMasterRecords<CfuRecord>(CFU_STORAGE_KEY, CFU_SEED).filter(
      (r) => r.id !== deleteTarget.id,
    );
    saveMasterRecords(CFU_STORAGE_KEY, list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "CFU deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "CFU Code", "CFU Name", "Description", "Status", "Created By", "Updated By", "Created At", "Updated At"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.cfuCode.replace(/"/g, '""')}"`,
          `"${r.cfuName.replace(/"/g, '""')}"`,
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
      link.setAttribute("download", `cfu_export_${masterToday()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "CFUs exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export CFUs", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add CFU"
      : sheetMode === "edit"
      ? "Edit CFU"
      : "View CFU";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">CFU Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Colony forming unit definitions</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total CFUs" value={records.length} icon={Microscope} accent={true} />
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

        <MasterListing<CfuRecord>
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
          addLabel="Add CFU"
          onExport={handleExport}
          emptyMessage="CFUs"
          searchPlaceholder="Search CFU code, name, description..."
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
        icon={Microscope}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<CfuRecord>({
                drawerTitle: "CFU",
                getRecordCode: (r) => r.cfuCode,
                basicInfo: (r) => [
                  { label: "CFU Name", value: r.cfuName },
                  { label: "CFU Code", value: r.cfuCode, mono: true },
                ],
                description: (r) => r.description,
                showDescription: true,
              })(active)
            : { title: "CFU", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
            <MasterFormGrid>
              <NameCodeDescriptionFields
                form={{ name: form.cfuName, code: form.cfuCode, description: form.description }}
                setForm={(u) =>
                  setForm((prev) => {
                    const n = typeof u === "function" ? u({ name: prev.cfuName, code: prev.cfuCode, description: prev.description }) : u;
                    return { ...prev, cfuName: n.name, cfuCode: n.code, description: n.description };
                  })
                }
                errors={{}}
                labels={{ name: "CFU Name", code: "CFU Code" }}
              />
            </MasterFormGrid>
          </div>
        }
        statusActive={form.status === "active"}
        onStatusChange={(v) => setForm((prev) => ({ ...prev, status: v ? "active" : "inactive" }))}
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
