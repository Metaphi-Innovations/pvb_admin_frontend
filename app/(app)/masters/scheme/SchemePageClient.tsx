"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Gift,
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
import { Label } from "@/components/ui/label";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterFormGrid } from "@/components/masters/MasterModule";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_SCHEME_FORM,
  formToScheme,
  SCHEME_SEED,
  SCHEME_STORAGE_KEY,
  schemeToForm,
  type SchemeForm,
  type SchemeRecord,
  validateSchemeForm,
  type DiscountType,
} from "./scheme-data";
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

function StatusToggle({ record, onToggle }: { record: SchemeRecord; onToggle: (item: SchemeRecord) => void }) {
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

function AuditCell({ name, date }: { name: string; date?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold leading-4 text-brand-700">{name}</p>
      {date ? <p className="text-[10px] font-mono leading-3 text-muted-foreground">{date}</p> : null}
    </div>
  );
}

export default function SchemeMasterPage() {
  const [records, setRecords] = useState<SchemeRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "schemeCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<SchemeRecord | null>(null);
  const [form, setForm] = useState<SchemeForm>(DEFAULT_SCHEME_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<SchemeRecord | null>(null);

  useEffect(() => {
    const loaded = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
    const needsMigration = loaded.some((r) => !r.discountType);
    if (needsMigration) {
      localStorage.removeItem(SCHEME_STORAGE_KEY);
      setRecords(loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED));
    } else {
      setRecords(loaded);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: SchemeRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: MASTER_CURRENT_USER, updatedAt: masterToday() }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(SCHEME_STORAGE_KEY, updated);
    setToast({
      msg: `Scheme status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const columns: ColumnConfig<SchemeRecord>[] = [
    {
      key: "schemeCode",
      header: "Scheme Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <span className="font-mono text-xs text-brand-700">{row.schemeCode}</span>
      ),
    },
    {
      key: "schemeName",
      header: "Scheme Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.schemeName}</span>
      ),
    },
    {
      key: "discountType",
      header: "Discount Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Percentage", value: "Percentage" },
        { label: "Flat", value: "Flat" },
      ],
      width: "120px",
    },
    {
      key: "discountValue",
      header: "Discount Value",
      width: "120px",
      render: (val, row) => (
        row.discountType === "Percentage" ? `${row.percentage}%` : `₹${row.flatDiscountAmount}`
      ),
    },
    {
      key: "startDate",
      header: "Start Date",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
    },
    {
      key: "endDate",
      header: "End Date",
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
    {
      key: "createdBy",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <AuditCell name={row.createdBy} date={row.createdAt} />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => <AuditCell name={row.updatedBy} date={row.updatedAt} />,
    },
  ];

  const actions: ActionItemConfig<SchemeRecord>[] = [
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
          r.schemeCode.toLowerCase().includes(q) ||
          r.schemeName.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof SchemeRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof SchemeRecord] ?? "").toLowerCase();
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
    const codes = records.map((r) => r.schemeCode);
    const code = nextMasterCode("SCH-", codes);
    setForm({
      ...DEFAULT_SCHEME_FORM,
      schemeCode: code,
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: SchemeRecord) => {
    setForm(schemeToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: SchemeRecord) => {
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
    const err = validateSchemeForm(form);
    if (err) {
      setErrors({ _form: err });
      return;
    }
    const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED);
    let updatedList: SchemeRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToScheme(form, id)];
      setToast({ msg: "Scheme added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) => (r.id === active.id ? formToScheme(form, active.id, active) : r));
      setToast({ msg: "Scheme updated successfully", type: "success" });
    } else {
      return;
    }
    saveMasterRecords(SCHEME_STORAGE_KEY, updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadMasterRecords<SchemeRecord>(SCHEME_STORAGE_KEY, SCHEME_SEED).filter(
      (r) => r.id !== deleteTarget.id,
    );
    saveMasterRecords(SCHEME_STORAGE_KEY, list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Scheme deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Scheme Code", "Scheme Name", "Discount Type", "Discount Value", "Start Date", "End Date", "Description", "Status", "Created By", "Updated By", "Created At", "Updated At"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const discValue = r.discountType === "Percentage" ? `${r.percentage}%` : `₹${r.flatDiscountAmount}`;
        const row = [
          r.id,
          `"${r.schemeCode.replace(/"/g, '""')}"`,
          `"${r.schemeName.replace(/"/g, '""')}"`,
          r.discountType,
          `"${discValue}"`,
          `"${r.startDate || ""}"`,
          `"${r.endDate || ""}"`,
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
      link.setAttribute("download", `schemes_export_${masterToday()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Schemes exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export schemes", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Scheme"
      : sheetMode === "edit"
      ? "Edit Scheme"
      : "View Scheme";

  const nextAutoCode = nextMasterCode("SCH-", records.map((r) => r.schemeCode));

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Scheme Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Promotional and pricing schemes</p>
        </div>

        {/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Schemes" value={records.length} icon={Gift} accent={true} />
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

        <MasterListing<SchemeRecord>
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
          addLabel="Add Scheme"
          onExport={handleExport}
          emptyMessage="schemes"
          searchPlaceholder="Search scheme code, name, description..."
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
        icon={Gift}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<SchemeRecord>({
                drawerTitle: "Scheme",
                getRecordCode: (r) => r.schemeCode,
                basicInfo: (r) => [
                  { label: "Scheme Name", value: r.schemeName },
                  { label: "Scheme Code", value: r.schemeCode, mono: true },
                  { label: "Discount Type", value: r.discountType },
                  {
                    label: r.discountType === "Percentage" ? "Percentage" : "Flat Discount Amount",
                    value: r.discountType === "Percentage" ? `${r.percentage}%` : `₹${r.flatDiscountAmount}`,
                  },
                  { label: "Start Date", value: r.startDate || "—" },
                  { label: "End Date", value: r.endDate || "—" },
                ],
                description: (r) => r.description,
                showDescription: true,
              })(active)
            : { title: "Scheme", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            {errors._form && <p className="text-xs font-semibold text-red-600">{errors._form}</p>}
            <MasterFormGrid>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Scheme Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.schemeName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, schemeName: e.target.value }));
                    setErrors((prev) => ({ ...prev, schemeName: "", _form: "" }));
                  }}
                  placeholder="e.g., Monsoon Discount"
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Scheme Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={sheetMode === "add" ? nextAutoCode : form.schemeCode}
                  disabled
                  readOnly
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, schemeCode: e.target.value }));
                    setErrors((prev) => ({ ...prev, schemeCode: "", _form: "" }));
                  }}
                  placeholder="e.g., SCH-001"
                  className="h-8 font-mono text-xs cursor-not-allowed disabled:opacity-100 bg-muted/30"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">
                  Discount Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v: DiscountType) => {
                    setForm((prev) => ({
                      ...prev,
                      discountType: v,
                      percentage: v === "Percentage" ? prev.percentage : "",
                      flatDiscountAmount: v === "Flat" ? prev.flatDiscountAmount : "",
                    }));
                    setErrors((prev) => ({ ...prev, _form: "" }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg border-border">
                    <SelectItem value="Percentage" className="text-xs">Percentage</SelectItem>
                    <SelectItem value="Flat" className="text-xs">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.discountType === "Percentage" ? (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium">
                    Percentage (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.percentage}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, percentage: e.target.value }));
                      setErrors((prev) => ({ ...prev, percentage: "", _form: "" }));
                    }}
                    placeholder="e.g., 10"
                    className="h-8 text-xs"
                  />
                </div>
              ) : (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-medium">
                    Flat Discount Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.flatDiscountAmount}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, flatDiscountAmount: e.target.value }));
                      setErrors((prev) => ({ ...prev, flatDiscountAmount: "", _form: "" }));
                    }}
                    placeholder="e.g., 500"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, startDate: e.target.value }));
                    setErrors((prev) => ({ ...prev, _form: "" }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, endDate: e.target.value }));
                    setErrors((prev) => ({ ...prev, _form: "" }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., monsoon scheme rules"
                  className="text-xs min-h-[72px] resize-none"
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
