"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Percent,
  CheckCircle2,
  XCircle,
  X,
  Download,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";
import {
  TDSMaster,
  loadTDSMasters,
  saveTDSMasters,
  todayStr,
  nextTDSId,
} from "./tds-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterListing } from "@/components/listing/MasterListing";
import { applyFilters } from "@/components/listing/filter-utils";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

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

function StatusToggle({ record, onToggle }: { record: TDSMaster; onToggle: (item: TDSMaster) => void }) {
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
        active ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export default function TDSPage() {
  const [records, setRecords] = useState<TDSMaster[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "tdsCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TDSMaster | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<TDSMaster | null>(null);
  const [form, setForm] = useState({
    tdsCode: "",
    tdsRate: 0,
    remarks: "",
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setRecords(loadTDSMasters());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const openAdd = () => {
    const list = loadTDSMasters();
    const nextCode = `TDS-${String(nextTDSId(list)).padStart(3, "0")}`;
    setForm({
      tdsCode: nextCode,
      tdsRate: 0,
      remarks: "",
      status: "active",
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: TDSMaster) => {
    setForm({
      tdsCode: row.tdsCode,
      tdsRate: row.tdsRate,
      remarks: row.remarks || "",
      status: row.status === "archived" ? "inactive" : row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: TDSMaster) => {
    setActive(row);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
  };

  const setFormField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const toggleStatus = (record: TDSMaster) => {
    const nextStatus: TDSMaster["status"] = record.status === "active" ? "inactive" : "active";
    const updated = records.map((r) =>
      r.id === record.id
        ? {
            ...r,
            status: nextStatus,
            updatedBy: "Admin",
            updatedDate: todayStr(),
            lastStatusChange: todayStr(),
          }
        : r
    );
    setRecords(updated);
    saveTDSMasters(updated);
    setToast({ msg: `TDS status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated: TDSMaster[] = records.map((r) =>
      r.id === deleteTarget.id
        ? { ...r, status: "archived" as const, updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    );
    saveTDSMasters(updated);
    setRecords(updated);
    setDeleteTarget(null);
    setToast({ msg: "TDS archived successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "TDS Code", "TDS Rate (%)", "Remarks", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records.filter(r => r.status !== "archived")) {
        const row = [
          r.id,
          `"${r.tdsCode.replace(/"/g, '""')}"`,
          r.tdsRate,
          `"${(r.remarks || "").replace(/"/g, '""')}"`,
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
      link.setAttribute("download", `tds_export_${todayStr()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "TDS configs exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export TDS configs", type: "error" });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.tdsCode.trim()) e.tdsCode = "TDS Code is required";
    if (form.tdsRate === undefined || form.tdsRate === null || form.tdsRate < 0) {
      e.tdsRate = "TDS Rate is required and must be non-negative";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const persist = () => {
    if (!validate()) return;
    const list = loadTDSMasters();
    let updatedList: TDSMaster[];
    if (sheetMode === "add") {
      const id = nextTDSId(list);
      const newRecord: TDSMaster = {
        id,
        tdsCode: form.tdsCode,
        tdsRate: form.tdsRate,
        remarks: form.remarks,
        status: "active",
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
        lastStatusChange: todayStr(),
      };
      updatedList = [...list, newRecord];
      setToast({ msg: "TDS added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id
          ? {
              ...r,
              tdsCode: form.tdsCode,
              tdsRate: form.tdsRate,
              remarks: form.remarks,
              status: form.status,
              updatedBy: "Admin",
              updatedDate: todayStr(),
              lastStatusChange: form.status !== active.status ? todayStr() : r.lastStatusChange,
            }
          : r
      );
      setToast({ msg: "TDS updated successfully", type: "success" });
    } else {
      return;
    }
    saveTDSMasters(updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const columns: ColumnConfig<TDSMaster>[] = [
    {
      key: "tdsCode",
      header: "TDS Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
      render: (val, row) => (
        <span className="font-mono font-semibold text-brand-700">
          {row.tdsCode}
        </span>
      ),
    },
    {
      key: "tdsRate",
      header: "TDS Rate (%)",
      sortable: true,
      filterable: false,
      width: "120px",
      render: (val, row) => (
        <span>{row.tdsRate}%</span>
      ),
    },
    {
      key: "remarks",
      header: "Remarks",
      sortable: false,
      filterable: true,
      filterType: "text",
      width: "320px",
      render: (val, row) => (
        <span>{row.remarks || "—"}</span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "120px",
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
  ];

  const actions: ActionItemConfig<TDSMaster>[] = [
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
    let result = records.filter(r => r.status !== "archived");

    // Search
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(r =>
        r.tdsCode.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let aVal = a[sort.key as keyof TDSMaster];
        let bVal = b[sort.key as keyof TDSMaster];
        if (aVal === undefined) aVal = "";
        if (bVal === undefined) bVal = "";
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
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

  const totalCount = records.filter(r => r.status !== "archived").length;
  const activeCount = records.filter(r => r.status === "active").length;
  const inactiveCount = records.filter(r => r.status === "inactive").length;

  const sheetTitle =
    sheetMode === "add"
      ? "Add TDS"
      : sheetMode === "edit"
      ? "Edit TDS"
      : "View TDS";

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">TDS Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage Tax Deducted at Source rates and configurations
          </p>
        </div>

        {/* KPI Cards */}
        {/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total TDS Configs" value={totalCount} icon={Percent} accent={true} />
          <MiniKPICard label="Active" value={activeCount} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={inactiveCount} icon={XCircle} accent={false} />
        </div> */}

        {/* Table Listing */}
        <MasterListing<TDSMaster>
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
          addLabel="Add TDS"
          onExport={handleExport}
          emptyMessage="TDS rates"
          searchPlaceholder="Search TDS Code, remarks..."
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
        icon={Percent}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<TDSMaster>({
                drawerTitle: "TDS",
                getRecordCode: (r) => r.tdsCode,
                basicInfo: (r) => [
                  { label: "TDS Code", value: r.tdsCode, mono: true },
                  { label: "TDS Rate (%)", value: `${r.tdsRate}%` },
                ],
                description: (r) => r.remarks,
                showDescription: true,
              })(active)
            : { title: "TDS", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  TDS Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  disabled
                  readOnly
                  value={form.tdsCode}
                  onChange={(e) => setFormField("tdsCode", e.target.value)}
                  placeholder="e.g., 194C, 194J"
                  className={cn(
                    "h-8 text-xs bg-background text-foreground border-border opacity-100 cursor-not-allowed",
                    errors.tdsCode && "border-red-400 focus-visible:ring-red-300",
                  )}
                />
                {errors.tdsCode && <p className="text-[11px] text-red-500">{errors.tdsCode}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  TDS Rate (%) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={form.tdsRate}
                  onChange={(e) => setFormField("tdsRate", parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 1, 5, 10"
                  step="0.01"
                  min="0"
                  className={cn("h-8 text-xs", errors.tdsRate && "border-red-400 focus-visible:ring-red-300")}
                />
                {errors.tdsRate && <p className="text-[11px] text-red-500">{errors.tdsRate}</p>}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium">Remarks</Label>
                <Textarea
                  value={form.remarks}
                  onChange={(e) => setFormField("remarks", e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                  className="text-xs rounded-lg resize-none min-h-[72px]"
                />
              </div>
            </div>
          </div>
        }
      />

      {/* Confirm Delete Dialog */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 border border-red-200 rounded-lg bg-red-50">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                Delete TDS
              </DialogTitle>
              <DialogDescription className="pt-1">
                Archive TDS {deleteTarget.tdsCode}? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
