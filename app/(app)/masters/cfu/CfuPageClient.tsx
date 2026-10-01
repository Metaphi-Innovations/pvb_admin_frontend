"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Microscope,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import {
  DEFAULT_CFU_FORM,
  formToCfu,
  CFU_SEED,
  CFU_STORAGE_KEY,
  cfuToForm,
  validateCfuForm,
  type CfuForm,
  type CfuRecord,
} from "./cfu-data";
import {
  loadMasterRecords,
  saveMasterRecords,
  masterToday,
  type MasterStatus,
} from "@/lib/masters/common";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { ListingUserCell, AuditUserRow, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ListingContainer } from "@/components/layout/ListingContainer";

type StatusTab = "all" | "active" | "inactive";
const CFU_TAB_KEY = "cfu-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(CFU_TAB_KEY);
  return v === "active" || v === "inactive" ? v : "all";
}

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

export default function CfuMasterPage() {
  const [records, setRecords] = useState<CfuRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "cfuName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<CfuRecord | null>(null);
  const [form, setForm] = useState<CfuForm>(DEFAULT_CFU_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<CfuRecord | null>(null);

  useEffect(() => {
    setRecords(loadMasterRecords<CfuRecord>(CFU_STORAGE_KEY, CFU_SEED));
    setStatusTab(readStoredStatusTab());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(CFU_TAB_KEY, next);
    setPage(1);
  };

  const toggleStatus = (record: CfuRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: nextStatus,
            updatedBy: "Admin User",
            updatedAt: masterToday(),
          }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(CFU_STORAGE_KEY, updated);
    setToast({
      msg: `CFU status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const statusTabCounts = useMemo(
    () => ({
      all: records.length,
      active: records.filter((r) => r.status === "active").length,
      inactive: records.filter((r) => r.status === "inactive").length,
    }),
    [records],
  );

  const columns: ColumnConfig<CfuRecord>[] = [
    {
      key: "cfuName",
      header: "CFU Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "220px",
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="text-xs font-semibold text-foreground hover:text-brand-600 hover:underline text-left"
        >
          {row.cfuName}
        </button>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "320px",
      render: (val) => (
        <span className="text-xs text-muted-foreground">{val ? String(val) : "—"}</span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdAt} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedAt} />
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
      width: "100px",
      render: (_val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => toggleStatus(row)}
        />
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

    if (statusTab !== "all") {
      result = result.filter((r) => r.status === statusTab);
    }

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.cfuName.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof CfuRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof CfuRecord] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort, statusTab]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize, statusTab]);

  const openAdd = () => {
    setForm({ ...DEFAULT_CFU_FORM });
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
    const list = loadMasterRecords<CfuRecord>(CFU_STORAGE_KEY, CFU_SEED);
    const fieldErrors = validateCfuForm(
      form,
      list,
      mode === "edit" ? active?.id : undefined,
    );
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    let updatedList: CfuRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToCfu(form, id)];
      setToast({ msg: "CFU added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id ? formToCfu(form, active.id, active) : r,
      );
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
    const updated = records.map((r) =>
      r.id === deleteTarget.id
        ? {
            ...r,
            status: "inactive" as MasterStatus,
            updatedBy: "Admin User",
            updatedAt: masterToday(),
          }
        : r,
    );
    saveMasterRecords(CFU_STORAGE_KEY, updated);
    setRecords(updated);
    setDeleteTarget(null);
    setToast({ msg: `"${deleteTarget.cfuName}" marked as inactive`, type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "ID",
        "CFU Name",
        "Description",
        "Status",
        "Created By",
        "Updated By",
        "Created At",
        "Updated At",
      ];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        csvRows.push(
          [
            r.id,
            `"${r.cfuName.replace(/"/g, '""')}"`,
            `"${(r.description || "").replace(/"/g, '""')}"`,
            r.status,
            r.createdBy,
            r.updatedBy,
            r.createdAt,
            r.updatedAt,
          ].join(","),
        );
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cfu_export_${masterToday()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
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

  const viewDrawer = active
    ? {
        title: active.cfuName,
        subtitle: "Read-only CFU details",
        status: active.status,
        basicInfo: [
          { label: "CFU Name", value: active.cfuName },
          {
            label: "Description",
            value: active.description?.trim() ? active.description : "—",
          },
        ],
        showDescription: false,
        children: (
          <MasterDrawerSection title="Audit Information">
            <div className="space-y-4">
              <AuditUserRow label="Created By" name={active.createdBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Created Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.createdAt}
                </p>
              </div>
              <AuditUserRow label="Updated By" name={active.updatedBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Updated Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.updatedAt}
                </p>
              </div>
            </div>
          </MasterDrawerSection>
        ),
      }
    : { title: "CFU", basicInfo: [] };

  return (
    <ListingContainer
      title="CFU Master"
      titleIcon={Microscope}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: `${t.label} (${statusTabCounts[t.value]})`,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
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
        emptyMessage="CFU records"
        searchPlaceholder="Search CFU name or description..."
        currentFilters={filters}
        currentSort={sort}
      />

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Microscope}
        viewDrawer={viewDrawer}
        statusActive={form.status === "active"}
        onStatusChange={
          sheetMode === "add" || sheetMode === "edit"
            ? (isActive) =>
                setForm((prev) => ({
                  ...prev,
                  status: isActive ? "active" : "inactive",
                }))
            : undefined
        }
        formContent={
          sheetMode !== "view" ? (
            <MasterFormGrid>
              <MasterField label="CFU Name" required error={errors.cfuName} className="sm:col-span-2">
                <Input
                  autoFocus
                  className={compactInput()}
                  value={form.cfuName}
                  onChange={(e) => setForm((prev) => ({ ...prev, cfuName: e.target.value }))}
                  placeholder="e.g. 1×10⁸ cells/ml"
                />
              </MasterField>
              <MasterField label="Description" className="sm:col-span-2">
                <Textarea
                  className="text-xs min-h-[72px] resize-none"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </MasterField>
            </MasterFormGrid>
          ) : null
        }
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Deactivate CFU?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {deleteTarget && (
                <>
                  <strong className="text-foreground">{deleteTarget.cfuName}</strong> will be
                  marked as inactive. It will remain visible in the All and Inactive tabs.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
              Mark Inactive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
