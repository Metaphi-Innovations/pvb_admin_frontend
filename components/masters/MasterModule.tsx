"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout, PageShell } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SkeletonRow } from "@/components/ui/Loaders";
import { useDeferredLoad } from "@/hooks/useDeferredLoad";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import {
  loadMasterRecords,
  saveMasterRecords,
  masterToday,
  MASTER_CURRENT_USER,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";
import { Eye, Pencil, Trash2, type LucideIcon } from "lucide-react";

export type SheetMode = "add" | "edit" | "view" | null;

export interface MasterModuleConfig<T extends BaseMasterRecord, F> {
  title: string;
  description: string;
  icon: LucideIcon;
  storageKey: string;
  seed: T[];
  codePrefix: string;
  addLabel?: string;
  columns: Column<T>[];
  searchKeys: (keyof T)[];
  defaultForm: F;
  getFormFromRecord: (r: T) => F;
  recordFromForm: (form: F, id: number, existing?: T) => T;
  validate: (form: F, mode: "add" | "edit") => string | null;
  renderFormFields: (ctx: {
    form: F;
    setForm: React.Dispatch<React.SetStateAction<F>>;
    mode: "add" | "edit";
    errors: Record<string, string>;
  }) => React.ReactNode;
  renderViewDetails: (record: T) => React.ReactNode;
  getCodeFromForm?: (form: F) => string;
  setCodeOnForm?: (form: F, code: string) => F;
}

export function MasterModule<T extends BaseMasterRecord, F>({
  config,
}: {
  config: MasterModuleConfig<T, F>;
}) {
  const {
    title,
    description,
    icon: Icon,
    storageKey,
    seed,
    codePrefix,
    addLabel = `Add ${title.replace(/ Master$/, "")}`,
    columns,
    searchKeys,
    defaultForm,
    getFormFromRecord,
    recordFromForm,
    validate,
    renderFormFields,
    renderViewDetails,
    setCodeOnForm,
  } = config;

  const { data: loadedRecords, ready } = useDeferredLoad(
    () => loadMasterRecords<T>(storageKey, seed),
    [storageKey, seed],
  );
  const [records, setRecords] = useState<T[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [active, setActive] = useState<T | null>(null);
  const [form, setForm] = useState<F>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  useEffect(() => {
    if (ready) setRecords(loadedRecords);
  }, [ready, loadedRecords]);

  const refresh = useCallback(() => {
    setRecords(loadMasterRecords<T>(storageKey, seed));
  }, [storageKey, seed]);

  const filtered = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== "all") {
      r = r.filter((row) => row.status === statusFilter);
    }
    return r;
  }, [records, search, statusFilter, searchKeys]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const openAdd = () => {
    const codes = records.map((r) => String((r as Record<string, unknown>).code ?? ""));
    const code = nextCodeFromRecords(codePrefix, codes);
    let f = { ...defaultForm };
    if (setCodeOnForm) f = setCodeOnForm(f, code);
    setForm(f);
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: T) => {
    setForm(getFormFromRecord(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: T) => {
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
    const err = validate(form, mode);
    if (err) {
      setErrors({ _form: err });
      return;
    }
    const list = loadMasterRecords<T>(storageKey, seed);
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      saveMasterRecords(storageKey, [...list, recordFromForm(form, id)]);
    } else if (active) {
      saveMasterRecords(
        storageKey,
        list.map((r) => (r.id === active.id ? recordFromForm(form, active.id, active) : r)),
      );
    }
    refresh();
    closeSheet();
  };

  const toggleStatus = useCallback(
    (row: T) => {
      const list = loadMasterRecords<T>(storageKey, seed);
      const next: MasterStatus = row.status === "active" ? "inactive" : "active";
      saveMasterRecords(
        storageKey,
        list.map((r) =>
          r.id === row.id
            ? { ...r, status: next, updatedBy: MASTER_CURRENT_USER, updatedAt: masterToday() }
            : r,
        ),
      );
      refresh();
    },
    [storageKey, seed, refresh],
  );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadMasterRecords<T>(storageKey, seed).filter((r) => r.id !== deleteTarget.id);
    saveMasterRecords(storageKey, list);
    setDeleteTarget(null);
    refresh();
  };

  const tableColumns: Column<T>[] = useMemo(
    () => [
      ...columns,
      {
        key: "status",
        header: "Status",
        align: "center",
        width: "90px",
        render: (_: unknown, row: T) => (
          <ActiveInactiveToggle
            active={row.status === "active"}
            onChange={() => toggleStatus(row)}
          />
        ),
      },
      {
        key: "createdBy",
        header: "Created By",
        sortable: true,
        render: (v: unknown) => <span className="text-muted-foreground text-xs">{String(v)}</span>,
      },
      {
        key: "updatedBy",
        header: "Updated By",
        sortable: true,
        render: (v: unknown) => <span className="text-muted-foreground text-xs">{String(v)}</span>,
      },
    ],
    [columns, toggleStatus],
  );

  const tableActions = useMemo(
    () => [
      { label: "View", icon: Eye, onClick: (r: unknown) => openView(r as T) },
      { label: "Edit", icon: Pencil, onClick: (r: unknown) => openEdit(r as T) },
      {
        label: "Delete",
        icon: Trash2,
        variant: "destructive" as const,
        onClick: (r: unknown) => setDeleteTarget(r as T),
      },
    ],
    [],
  );

  const sheetTitle =
    sheetMode === "add" ? `Add ${title.replace(/ Master$/, "")}` : sheetMode === "edit" ? `Edit ${title.replace(/ Master$/, "")}` : `View ${title.replace(/ Master$/, "")}`;

  return (
    <AppLayout>
      <PageShell>
        <PageHeader
          title={title}
          description={description}
          icon={Icon}
          breadcrumbs={[
            { label: "Masters", href: "/masters/category" },
            { label: title },
          ]}
          actions={
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              onClick={openAdd}
            >
              {addLabel}
            </Button>
          }
        />

        {!ready ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-8 flex-1 max-w-sm rounded-lg skeleton" />
              <div className="h-8 w-28 rounded-lg skeleton" />
            </div>
            <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <th key={i} className="px-4 py-3">
                        <div className="h-3 w-16 rounded skeleton" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} cols={6} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            data={paginated}
            totalCount={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder={`Search ${title.toLowerCase()}…`}
            rowKey={(r) => String(r.id)}
            onRowClick={openView}
            emptyModule={title}
            filterSlot={
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
            actions={tableActions}
          />
        )}

        <Sheet open={sheetMode !== null} onOpenChange={(o) => !o && closeSheet()}>
          <SheetContent>
            <SheetHeader>
              <div className="flex items-start gap-3 pr-8">
                <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                  <SheetDescription className="text-xs">
                    {sheetMode === "view" ? "Read-only details" : "Compact master form"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <SheetBody>
              {sheetMode === "view" && active ? (
                <div className="space-y-4">
                  {renderViewDetails(active)}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
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
                  {renderFormFields({
                    form,
                    setForm,
                    mode: sheetMode === "add" ? "add" : "edit",
                    errors,
                  })}
                  <StatusField
                    active={(form as { status?: MasterStatus }).status === "active"}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))
                    }
                  />
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
                    className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
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
                    className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
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
              <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </AppLayout>
  );
}

function StatusField({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
      <div>
        <p className="text-xs font-medium">Status</p>
        <p className="text-[11px] text-muted-foreground">{active ? "Active" : "Inactive"}</p>
      </div>
      <Switch checked={active} onCheckedChange={onChange} />
    </div>
  );
}

function nextCodeFromRecords(prefix: string, codes: string[]): string {
  const nums = codes
    .map((c) => {
      const m = c.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function MasterFormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

export function MasterField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export function MasterViewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/40 text-xs last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

export function compactInput(className?: string) {
  return `h-8 text-xs ${className ?? ""}`;
}
