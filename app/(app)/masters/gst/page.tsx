"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Percent,
  CheckCircle2,
  XCircle,
  X,
  Edit2,
  CalendarDays,
  Eye,
  Trash2,
} from "lucide-react";
import {
  GSTMaster,
  loadGSTMasters,
  saveGSTMasters,
  todayStr,
  nextGSTId,
  generateGSTCode,
} from "./gst-data";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterViewRow } from "@/components/masters/MasterModule";

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

function StatusToggle({ record, onToggle }: { record: GSTMaster; onToggle: (item: GSTMaster) => void }) {
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

export default function GSTPage() {
  const [records, setRecords] = useState<GSTMaster[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "gstId", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<GSTMaster | null>(null);
  const [form, setForm] = useState({
    gstId: "",
    gstPercentage: 0,
    remarks: "",
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<GSTMaster | null>(null);

  useEffect(() => {
    setRecords(loadGSTMasters());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: GSTMaster) => {
    const newStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((r) =>
      r.id === record.id
        ? {
            ...r,
            status: newStatus as "active" | "inactive",
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : r,
    );
    setRecords(updated);
    saveGSTMasters(updated);
    setToast({
      msg: `GST status updated to ${newStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const columns: ColumnConfig<GSTMaster>[] = [
    {
      key: "gstId",
      header: "GST ID",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "100px",
      render: (val, row) => (
        <span className="font-mono font-semibold text-brand-700">{row.gstId}</span>
      ),
    },
    {
      key: "gstPercentage",
      header: "GST Percentage",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "140px",
      render: (val, row) => `${row.gstPercentage}%`,
    },
    {
      key: "remarks",
      header: "Remarks",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (val, row) => row.remarks || "—",
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

  const actions: ActionItemConfig<GSTMaster>[] = [
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
      const q = String(filters.search).toLowerCase();
      result = result.filter(
        (r) =>
          r.gstId.toLowerCase().includes(q) ||
          String(r.gstPercentage).includes(q) ||
          (r.remarks || "").toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        let aVal = a[sort.key as keyof GSTMaster];
        let bVal = b[sort.key as keyof GSTMaster];
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
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const openAdd = () => {
    const nextIdVal = nextGSTId(records);
    const code = generateGSTCode(nextIdVal);
    setForm({
      gstId: code,
      gstPercentage: 0,
      remarks: "",
      status: "active",
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: GSTMaster) => {
    setForm({
      gstId: row.gstId,
      gstPercentage: row.gstPercentage,
      remarks: row.remarks || "",
      status: row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: GSTMaster) => {
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

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.gstPercentage === undefined || form.gstPercentage === null || form.gstPercentage < 0) {
      e.gstPercentage = "GST Percentage is required and must be non-negative";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const persist = () => {
    if (!validate()) return;
    const list = loadGSTMasters();
    let updatedList: GSTMaster[];
    if (sheetMode === "add") {
      const id = nextGSTId(list);
      const newRecord: GSTMaster = {
        id,
        gstId: form.gstId,
        gstPercentage: form.gstPercentage,
        remarks: form.remarks,
        status: form.status,
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
      };
      updatedList = [...list, newRecord];
      setToast({ msg: "GST added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id
          ? {
              ...r,
              gstPercentage: form.gstPercentage,
              remarks: form.remarks,
              status: form.status,
              updatedBy: "Admin",
              updatedDate: todayStr(),
            }
          : r,
      );
      setToast({ msg: "GST updated successfully", type: "success" });
    } else {
      return;
    }
    saveGSTMasters(updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadGSTMasters().filter((r) => r.id !== deleteTarget.id);
    saveGSTMasters(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "GST deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "GST ID", "GST Percentage", "Remarks", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.gstId.replace(/"/g, '""')}"`,
          r.gstPercentage,
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
      link.setAttribute("download", `gst_export_${todayStr()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "GST configs exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export GST configs", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add GST"
      : sheetMode === "edit"
      ? "Edit GST"
      : "View GST";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">GST Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage GST configurations and tax rates
          </p>
        </div>

        {/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total GST Configs" value={records.length} icon={Percent} accent={true} />
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

        <MasterListing<GSTMaster>
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
          addLabel="Add GST"
          onExport={handleExport}
          emptyMessage="GST configs"
          searchPlaceholder="Search GST ID, percentage or remarks..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="flex items-center justify-center border w-9 h-9 rounded-xl bg-brand-50 border-brand-100">
                <Percent className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                <SheetDescription className="text-xs">
                  {sheetMode === "view" ? "Read-only details" : "Compact GST form"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody>
            {sheetMode === "view" && active ? (
              <div className="space-y-4">
                <div className="px-3 border rounded-lg border-border/60 bg-muted/10">
                  <MasterViewRow label="GST ID" value={<span className="font-mono">{active.gstId}</span>} />
                  <MasterViewRow label="GST Percentage" value={`${active.gstPercentage}%`} />
                  <MasterViewRow label="Remarks" value={active.remarks || "—"} />
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">GST ID (Auto)</Label>
                    <Input
                      value={form.gstId}
                      disabled
                      className="h-8 text-xs cursor-not-allowed bg-muted/30 text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      GST Percentage <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.gstPercentage}
                      onChange={(e) => setFormField("gstPercentage", parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 18.0"
                      step="0.01"
                      min="0"
                      className={cn("h-8 text-xs", errors.gstPercentage && "border-red-400 focus-visible:ring-red-300")}
                    />
                    {errors.gstPercentage && <p className="text-[11px] text-red-500">{errors.gstPercentage}</p>}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">Remarks</Label>
                    <Textarea
                      value={form.remarks}
                      onChange={(e) => setFormField("remarks", e.target.value)}
                      placeholder="Enter remarks"
                      rows={3}
                      className="text-xs resize-none rounded-lg min-h-[72px]"
                    />
                  </div>
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
