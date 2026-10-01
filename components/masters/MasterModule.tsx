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
import { ListingAuditCell } from "@/components/listing/ListingAuditCell";
import {
  loadMasterRecords,
  saveMasterRecords,
  masterToday,
  MASTER_CURRENT_USER,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";
import { Eye, Pencil, Trash2, type LucideIcon } from "lucide-react";
import {
  MasterRecordDrawer,
  masterAuditFromRecord,
  MASTER_DRAWER_CLASS,
  type MasterDrawerField,
  type MasterDrawerAuditInfo,
} from "./MasterRecordDrawer";

export type SheetMode = "add" | "edit" | "view" | null;

export interface MasterViewConfig<T extends BaseMasterRecord> {
  /** Drawer title — defaults to module title without " Master" suffix */
  drawerTitle?: string;
  getRecordCode?: (record: T) => string | undefined;
  basicInfo: (record: T) => MasterDrawerField[];
  description?: (record: T) => string | null | undefined;
  showDescription?: boolean;
  auditInfo?: (record: T) => MasterDrawerAuditInfo;
}

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
  /** @deprecated Prefer viewConfig for structured drawer layout */
  renderViewDetails?: (record: T) => React.ReactNode;
  viewConfig?: MasterViewConfig<T>;
  getCodeFromForm?: (form: F) => string;
  setCodeOnForm?: (form: F, code: string) => F;
  hideColumnSelection?: boolean;
  auditColumnVariant?: "plain" | "product";
  auditColumnHeaders?: {
    created: string;
    updated: string;
  };
}

function AuditCell({
  name,
  date,
  variant,
}: {
  name?: string;
  date?: string;
  variant: "created" | "updated";
}) {
  return <ListingAuditCell name={name} date={date} variant={variant} />;
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
    viewConfig,
    setCodeOnForm,
    hideColumnSelection,
    auditColumnVariant = "plain",
    auditColumnHeaders = {
      created: "Created By",
      updated: "Updated By",
    },
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
        header: auditColumnHeaders.created,
        sortable: true,
        render:
          auditColumnVariant === "product"
            ? (_: unknown, row: T) => (
                <AuditCell name={row.createdBy} date={row.createdAt} variant="created" />
              )
            : (v: unknown) => <span className="text-muted-foreground text-xs">{String(v)}</span>,
      },
      {
        key: "updatedBy",
        header: auditColumnHeaders.updated,
        sortable: true,
        render:
          auditColumnVariant === "product"
            ? (_: unknown, row: T) => (
                <AuditCell name={row.updatedBy} date={row.updatedAt} variant="updated" />
              )
            : (v: unknown) => <span className="text-muted-foreground text-xs">{String(v)}</span>,
      },
    ],
    [auditColumnHeaders.created, auditColumnHeaders.updated, auditColumnVariant, columns, toggleStatus],
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

  const drawerTitle = viewConfig?.drawerTitle ?? title.replace(/ Master$/, "");

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
            <div className="master-listing-table-shell overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="master-listing-thead-row">
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
            hideColumnSelection={hideColumnSelection}
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

        <MasterRecordDrawer
          open={sheetMode === "view" && !!active}
          onOpenChange={(o) => !o && closeSheet()}
          onClose={closeSheet}
          onEdit={() => active && openEdit(active)}
          title={drawerTitle}
          icon={Icon}
          recordCode={active ? viewConfig?.getRecordCode?.(active) ?? undefined : undefined}
          status={active?.status}
          basicInfo={active && viewConfig ? viewConfig.basicInfo(active) : []}
          description={
            active && viewConfig?.description
              ? viewConfig.description(active) ?? undefined
              : undefined
          }
          showDescription={viewConfig?.showDescription ?? !!viewConfig?.description}
          auditInfo={
            active
              ? viewConfig?.auditInfo?.(active) ?? masterAuditFromRecord(active)
              : undefined
          }
        >
          {active && renderViewDetails && !viewConfig ? renderViewDetails(active) : null}
        </MasterRecordDrawer>

        <Sheet open={sheetMode === "add" || sheetMode === "edit"} onOpenChange={(o) => !o && closeSheet()}>
          <SheetContent className={MASTER_DRAWER_CLASS}>
            <SheetHeader>
              <div className="flex items-start gap-3 pr-8">
                <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                  <SheetDescription className="text-xs">Compact master form</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <SheetBody>
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
            </SheetBody>

            <SheetFooter>
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
