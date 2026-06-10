"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  FlaskConical,
  XCircle,
  X,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { MasterFormGrid, MasterViewRow } from "@/components/masters/MasterModule";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  DEFAULT_FORMULATION_FORM,
  formToFormulation,
  FORMULATION_SEED,
  FORMULATION_STORAGE_KEY,
  formulationToForm,
  type FormulationForm,
  type FormulationRecord,
  validateFormulationForm,
} from "./formulation-data";
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

function StatusToggle({ record, onToggle }: { record: FormulationRecord; onToggle: (item: FormulationRecord) => void }) {
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

export default function FormulationMasterPage() {
  const [records, setRecords] = useState<FormulationRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "formulationCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<FormulationRecord | null>(null);
  const [form, setForm] = useState<FormulationForm>(DEFAULT_FORMULATION_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<FormulationRecord | null>(null);

  useEffect(() => {
    setRecords(loadMasterRecords<FormulationRecord>(FORMULATION_STORAGE_KEY, FORMULATION_SEED));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: FormulationRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: MASTER_CURRENT_USER, updatedAt: masterToday() }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(FORMULATION_STORAGE_KEY, updated);
    setToast({
      msg: `Formulation status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const columns: ColumnConfig<FormulationRecord>[] = [
    {
      key: "formulationCode",
      header: "Formulation Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
    },
    {
      key: "formulationName",
      header: "Formulation Name",
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

  const actions: ActionItemConfig<FormulationRecord>[] = [
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
          r.formulationCode.toLowerCase().includes(q) ||
          r.formulationName.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof FormulationRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof FormulationRecord] ?? "").toLowerCase();
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
    const codes = records.map((r) => r.formulationCode);
    const code = nextMasterCode("FORM-", codes);
    setForm({
      ...DEFAULT_FORMULATION_FORM,
      formulationCode: code,
    });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: FormulationRecord) => {
    setForm(formulationToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: FormulationRecord) => {
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
    const err = validateFormulationForm(form);
    if (err) {
      setErrors({ _form: err });
      return;
    }
    const list = loadMasterRecords<FormulationRecord>(FORMULATION_STORAGE_KEY, FORMULATION_SEED);
    let updatedList: FormulationRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToFormulation(form, id)];
      setToast({ msg: "Formulation added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) => (r.id === active.id ? formToFormulation(form, active.id, active) : r));
      setToast({ msg: "Formulation updated successfully", type: "success" });
    } else {
      return;
    }
    saveMasterRecords(FORMULATION_STORAGE_KEY, updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadMasterRecords<FormulationRecord>(FORMULATION_STORAGE_KEY, FORMULATION_SEED).filter(
      (r) => r.id !== deleteTarget.id,
    );
    saveMasterRecords(FORMULATION_STORAGE_KEY, list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Formulation deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Formulation Code", "Formulation Name", "Description", "Status", "Created By", "Updated By", "Created At", "Updated At"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.formulationCode.replace(/"/g, '""')}"`,
          `"${r.formulationName.replace(/"/g, '""')}"`,
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
      link.setAttribute("download", `formulations_export_${masterToday()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Formulations exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export formulations", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Formulation"
      : sheetMode === "edit"
      ? "Edit Formulation"
      : "View Formulation";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Formulation Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Product formulation types</p>
        </div>

        {/* <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Formulations" value={records.length} icon={FlaskConical} accent={true} />
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

        <MasterListing<FormulationRecord>
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
          addLabel="Add Formulation"
          onExport={handleExport}
          emptyMessage="formulations"
          searchPlaceholder="Search formulation code, name, description..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="flex items-center justify-center border w-9 h-9 rounded-xl bg-brand-50 border-brand-100">
                <FlaskConical className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                <SheetDescription className="text-xs">
                  {sheetMode === "view" ? "Read-only details" : "Compact formulation form"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <SheetBody>
            {sheetMode === "view" && active ? (
              <div className="space-y-4">
                <div className="px-3 border rounded-lg border-border/60 bg-muted/10">
                  <MasterViewRow label="Formulation Name" value={active.formulationName} />
                  <MasterViewRow label="Formulation Code" value={<span className="font-mono">{active.formulationCode}</span>} />
                  <MasterViewRow label="Description" value={active.description || "—"} />
                  <MasterViewRow label="Status" value={active.status === "active" ? "Active" : "Inactive"} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Created By</p>
                    <p className="font-medium">{active.createdBy}</p>
                    <p className="text-muted-foreground">{active.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Updated By</p>
                    <p className="font-medium">{active.updatedBy}</p>
                    <p className="text-muted-foreground">{active.updatedAt}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {errors._form && <p className="text-xs text-red-600">{errors._form}</p>}
                <MasterFormGrid>
                  <NameCodeDescriptionFields
                    form={{ name: form.formulationName, code: form.formulationCode, description: form.description }}
                    setForm={(u) =>
                      setForm((prev) => {
                        const n = typeof u === "function" ? u({ name: prev.formulationName, code: prev.formulationCode, description: prev.description }) : u;
                        return { ...prev, formulationName: n.name, formulationCode: n.code, description: n.description };
                      })
                    }
                    errors={{}}
                    labels={{ name: "Formulation Name", code: "Formulation Code" }}
                  />
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
