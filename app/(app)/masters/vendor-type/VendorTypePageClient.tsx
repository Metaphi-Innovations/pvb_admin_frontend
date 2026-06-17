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
  Tags,
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
import { normalizeInitialCode } from "@/lib/masters/code-generation";
import {
  DEFAULT_VENDOR_TYPE_FORM,
  formToVendorType,
  VENDOR_TYPE_SEED,
  VENDOR_TYPE_STORAGE_KEY,
  vendorTypeToForm,
  validateVendorTypeForm,
  type VendorTypeForm,
  type VendorTypeRecord,
} from "./vendor-type-data";
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
const TAB_KEY = "vendor-type-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(TAB_KEY);
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

export default function VendorTypeMasterPage() {
  const [records, setRecords] = useState<VendorTypeRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "vendorTypeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<VendorTypeRecord | null>(null);
  const [form, setForm] = useState<VendorTypeForm>(DEFAULT_VENDOR_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<VendorTypeRecord | null>(null);

  useEffect(() => {
    setRecords(loadMasterRecords<VendorTypeRecord>(VENDOR_TYPE_STORAGE_KEY, VENDOR_TYPE_SEED));
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
    sessionStorage.setItem(TAB_KEY, next);
    setPage(1);
  };

  const toggleStatus = (record: VendorTypeRecord) => {
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
    saveMasterRecords(VENDOR_TYPE_STORAGE_KEY, updated);
    setToast({
      msg: `Vendor type status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
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

  const columns: ColumnConfig<VendorTypeRecord>[] = [
    {
      key: "vendorTypeName",
      header: "Vendor Type Name",
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
          {row.vendorTypeName}
        </button>
      ),
    },
    {
      key: "initialCode",
      header: "Initial Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "110px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-foreground">{row.initialCode}</span>
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

  const actions: ActionItemConfig<VendorTypeRecord>[] = [
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
          r.vendorTypeName.toLowerCase().includes(q) ||
          r.initialCode.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof VendorTypeRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof VendorTypeRecord] ?? "").toLowerCase();
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
    setForm({ ...DEFAULT_VENDOR_TYPE_FORM });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: VendorTypeRecord) => {
    setForm(vendorTypeToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: VendorTypeRecord) => {
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
    const list = loadMasterRecords<VendorTypeRecord>(VENDOR_TYPE_STORAGE_KEY, VENDOR_TYPE_SEED);
    const fieldErrors = validateVendorTypeForm(
      form,
      list,
      mode === "edit" ? active?.id : undefined,
    );
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    let updatedList: VendorTypeRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToVendorType(form, id)];
      setToast({ msg: "Vendor type added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id ? formToVendorType(form, active.id, active) : r,
      );
      setToast({ msg: "Vendor type updated successfully", type: "success" });
    } else {
      return;
    }

    saveMasterRecords(VENDOR_TYPE_STORAGE_KEY, updatedList);
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
    saveMasterRecords(VENDOR_TYPE_STORAGE_KEY, updated);
    setRecords(updated);
    setDeleteTarget(null);
    setToast({ msg: `"${deleteTarget.vendorTypeName}" marked as inactive`, type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "ID",
        "Vendor Type Name",
        "Initial Code",
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
            `"${r.vendorTypeName.replace(/"/g, '""')}"`,
            r.initialCode,
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
      link.download = `vendor_type_export_${masterToday()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "Vendor types exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export vendor types", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Vendor Type"
      : sheetMode === "edit"
        ? "Edit Vendor Type"
        : "View Vendor Type";

  const viewDrawer = active
    ? {
        title: active.vendorTypeName,
        subtitle: "Read-only vendor type details",
        status: active.status,
        basicInfo: [
          { label: "Vendor Type Name", value: active.vendorTypeName },
          { label: "Initial Code", value: active.initialCode },
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
    : { title: "Vendor Type", basicInfo: [] };

  return (
    <ListingContainer
      title="Vendor Type Master"
      titleIcon={Tags}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: `${t.label} (${statusTabCounts[t.value]})`,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      <MasterListing<VendorTypeRecord>
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
        addLabel="Add Vendor Type"
        onExport={handleExport}
        emptyMessage="vendor types"
        searchPlaceholder="Search vendor type name, initial code, description..."
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
        icon={Tags}
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
              <MasterField
                label="Vendor Type Name"
                required
                error={errors.vendorTypeName}
                className="sm:col-span-2"
              >
                <Input
                  autoFocus
                  className={compactInput()}
                  value={form.vendorTypeName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, vendorTypeName: e.target.value }))
                  }
                  placeholder="e.g. Creditor for Goods"
                />
              </MasterField>
              <MasterField
                label="Initial Code"
                required
                error={errors.initialCode}
              >
                <Input
                  className={cn(compactInput(), "font-mono uppercase")}
                  value={form.initialCode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      initialCode: normalizeInitialCode(e.target.value),
                    }))
                  }
                  placeholder="e.g. CG"
                  maxLength={5}
                />
              </MasterField>
              <MasterField label="Description" className="sm:col-span-2">
                <Textarea
                  className="text-xs min-h-[72px] resize-none"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
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
              Deactivate Vendor Type?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {deleteTarget && (
                <>
                  <strong className="text-foreground">{deleteTarget.vendorTypeName}</strong> will be
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
