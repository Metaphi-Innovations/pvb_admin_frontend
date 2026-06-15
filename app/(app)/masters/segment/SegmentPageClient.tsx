"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  PieChart,
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
import { Switch } from "@/components/ui/switch";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterFormGrid } from "@/components/masters/MasterModule";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  DEFAULT_SEGMENT_FORM,
  formToSegment,
  SEGMENT_SEED,
  SEGMENT_STORAGE_KEY,
  segmentToForm,
  type SegmentForm,
  type SegmentRecord,
  validateSegmentForm,
} from "./segment-data";
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
      <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StatusToggle({ record, onToggle }: { record: SegmentRecord; onToggle: (item: SegmentRecord) => void }) {
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

function AuditCell({ name, date }: { name: string; date?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold leading-4 text-brand-700">{name}</p>
      {date ? <p className="text-[10px] font-mono leading-3 text-muted-foreground">{date}</p> : null}
    </div>
  );
}

export default function SegmentMasterPage() {
  const [records, setRecords] = useState<SegmentRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "segmentCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<SegmentRecord | null>(null);
  const [form, setForm] = useState<SegmentForm>(DEFAULT_SEGMENT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<SegmentRecord | null>(null);

  useEffect(() => {
    setRecords(loadMasterRecords<SegmentRecord>(SEGMENT_STORAGE_KEY, SEGMENT_SEED));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: SegmentRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: MASTER_CURRENT_USER, updatedAt: masterToday() }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(SEGMENT_STORAGE_KEY, updated);
    setToast({
      msg: `Segment status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const columns: ColumnConfig<SegmentRecord>[] = [
    {
      key: "segmentCode",
      header: "Segment Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <span className="font-mono text-xs text-brand-700">{row.segmentCode}</span>
      ),
    },
    {
      key: "segmentName",
      header: "Segment Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.segmentName}</span>
      ),
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
        <StatusToggle record={row} onToggle={toggleStatus} />
      ),
    },
    {
      key: "createdBy",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <AuditCell name={row.createdBy} date={row.createdAt} />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (val, row) => <AuditCell name={row.updatedBy} date={row.updatedAt} />,
    },
  ];

  const actions: ActionItemConfig<SegmentRecord>[] = [
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
          r.segmentCode.toLowerCase().includes(q) ||
          r.segmentName.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof SegmentRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof SegmentRecord] ?? "").toLowerCase();
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
    const codes = records.map((r) => r.segmentCode);
    const code = nextMasterCode("SEG-", codes);
    setForm({
      ...DEFAULT_SEGMENT_FORM,
      segmentCode: code,
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: SegmentRecord) => {
    setForm(segmentToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: SegmentRecord) => {
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
    const err = validateSegmentForm(form);
    if (err) {
      setErrors({ _form: err });
      return;
    }
    const list = loadMasterRecords<SegmentRecord>(SEGMENT_STORAGE_KEY, SEGMENT_SEED);
    let updatedList: SegmentRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToSegment(form, id)];
      setToast({ msg: "Segment added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) => (r.id === active.id ? formToSegment(form, active.id, active) : r));
      setToast({ msg: "Segment updated successfully", type: "success" });
    } else {
      return;
    }
    saveMasterRecords(SEGMENT_STORAGE_KEY, updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadMasterRecords<SegmentRecord>(SEGMENT_STORAGE_KEY, SEGMENT_SEED).filter(
      (r) => r.id !== deleteTarget.id,
    );
    saveMasterRecords(SEGMENT_STORAGE_KEY, list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Segment deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Segment Code", "Segment Name", "Description", "Status", "Created By", "Updated By", "Created At", "Updated At"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.segmentCode.replace(/"/g, '""')}"`,
          `"${r.segmentName.replace(/"/g, '""')}"`,
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
      link.setAttribute("download", `segments_export_${masterToday()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Segments exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export segments", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Segment"
      : sheetMode === "edit"
      ? "Edit Segment"
      : "View Segment";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Segment Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Market and customer segments</p>
        </div>

        {/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Segments" value={records.length} icon={PieChart} accent={true} />
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

        <MasterListing<SegmentRecord>
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
          addLabel="Add Segment"
          onExport={handleExport}
          emptyMessage="segments"
          searchPlaceholder="Search segment code, name, description..."
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
        icon={PieChart}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<SegmentRecord>({
                drawerTitle: "Segment",
                getRecordCode: (r) => r.segmentCode,
                basicInfo: (r) => [
                  { label: "Segment Name", value: r.segmentName },
                  { label: "Segment Code", value: r.segmentCode, mono: true },
                ],
                description: (r) => r.description,
                showDescription: true,
              })(active)
            : { title: "Segment", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
            <MasterFormGrid>
              <NameCodeDescriptionFields
                form={{ name: form.segmentName, code: form.segmentCode, description: form.description }}
                setForm={(u) =>
                  setForm((prev) => {
                    const n = typeof u === "function" ? u({ name: prev.segmentName, code: prev.segmentCode, description: prev.description }) : u;
                    return { ...prev, segmentName: n.name, segmentCode: n.code, description: n.description };
                  })
                }
                errors={{}}
                labels={{ name: "Segment Name", code: "Segment Code" }}
                codeDisabled
                codeFirst
              />
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
