"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  XCircle,
  X,
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

import {
  SupplierListService,
  sortStateToOrdering,
  type SupplierListRecord,
} from "@/services/supplier-list.service";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { MiniKPICard } from "@/components/ui/KPICard";

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingUserCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { useSuppliers, useToggleSupplierStatus, useExportSuppliers, useSupplierFilterDropdown } from "@/hooks/masters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { mergeListRequestFilters, MASTER_FILTER_FIELD_MAPS, resolveListStatus } from "@/lib/masters/list-api-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";

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

export default function VendorMasterPage() {
  const router = useRouter();
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "supplierName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierListRecord | null>(null);

  // const refresh = useCallback(() => setRecords(loadVendors()), []);

  // useEffect(() => {
  //   refresh();
  // }, [refresh]);

  const apiFilters = useMemo(
    () => mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.supplier),
    [appliedFilters],
  );
  const listStatus = useMemo(
    () => resolveListStatus(appliedFilters),
    [appliedFilters],
  );
  const listParams: MasterListKeyParams = useMemo(() => ({
    page,
    pageSize,
    search: appliedSearch,
    ordering: sortStateToOrdering(sort.key, sort.direction),
    status: listStatus,
    apiFilters,
  }), [page, pageSize, appliedSearch, sort, listStatus, apiFilters]);

  const { data } = useSuppliers(listParams);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const supplierCodeOptionsQuery = useSupplierFilterDropdown("supplier_code", {
    enabled: isFilterOpen("supplierCode"),
  });
  const supplierNameOptionsQuery = useSupplierFilterDropdown("supplier_name", {
    enabled: isFilterOpen("supplierName"),
  });
  const supplierTypeOptionsQuery = useSupplierFilterDropdown("supplier_type__supplier_type_name", {
    enabled: isFilterOpen("supplierType"),
  });
  const contactPersonOptionsQuery = useSupplierFilterDropdown("contact_person", {
    enabled: isFilterOpen("contactPerson"),
  });
  const mobileOptionsQuery = useSupplierFilterDropdown("mobile_number", {
    enabled: isFilterOpen("mobile"),
  });
  const gstinOptionsQuery = useSupplierFilterDropdown("gstin_number", {
    enabled: isFilterOpen("gstNumber"),
  });
  const statusOptionsQuery = useSupplierFilterDropdown("is_active", {
    enabled: isFilterOpen("status"),
  });
  const createdByOptionsQuery = useSupplierFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdBy"),
  });
  const updatedByOptionsQuery = useSupplierFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedBy"),
  });

  const supplierCodeOptions = useMemo(() => supplierCodeOptionsQuery.data ?? [], [supplierCodeOptionsQuery.data]);
  const supplierNameOptions = useMemo(() => supplierNameOptionsQuery.data ?? [], [supplierNameOptionsQuery.data]);
  const supplierTypeOptions = useMemo(() => supplierTypeOptionsQuery.data ?? [], [supplierTypeOptionsQuery.data]);
  const contactPersonOptions = useMemo(() => contactPersonOptionsQuery.data ?? [], [contactPersonOptionsQuery.data]);
  const mobileOptions = useMemo(() => mobileOptionsQuery.data ?? [], [mobileOptionsQuery.data]);
  const gstinOptions = useMemo(() => gstinOptionsQuery.data ?? [], [gstinOptionsQuery.data]);
  const statusOptions = useMemo(
    () =>
      statusOptionsQuery.data?.length
        ? statusOptionsQuery.data
        : [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
    [statusOptionsQuery.data],
  );
  const createdByOptions = useMemo(() => createdByOptionsQuery.data ?? [], [createdByOptionsQuery.data]);
  const updatedByOptions = useMemo(() => updatedByOptionsQuery.data ?? [], [updatedByOptionsQuery.data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // const toggleStatus = (record: Vendor) => {
  //   const nextStatus = record.status === "active" ? "inactive" : "active";
  //   const updated: Vendor = {
  //     ...record,
  //     status: nextStatus,
  //     updatedBy: CURRENT_USER,
  //     updatedDate: todayStr(),
  //   };
  //   const updatedList = records.map((x) => (x.id === record.id ? updated : x));
  //   saveVendors(updatedList);
  //   setRecords(updatedList);
  //   setToast({ msg: `Vendor status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  // };

  const toggleStatusMutation = useToggleSupplierStatus();
  const toggleStatus = (record: SupplierListRecord) => {
    const nextActive = record.status !== "active";
    toggleStatusMutation.mutate(
      { id: record.supplierUuid, isActive: nextActive },
      {
        onSuccess: () => setToast({ msg: `Vendor status updated to ${nextActive ? "Active" : "Inactive"}`, type: "success" }),
        onError: (err) => setToast({ msg: SupplierListService.extractErrorMessage(err, "Failed to update status"), type: "error" }),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    toggleStatusMutation.mutate(
      { id: deleteTarget.supplierUuid, isActive: false },
      {
        onSuccess: () => {
          setToast({ msg: `"${deleteTarget.supplierName}" marked as inactive`, type: "success" });
          setDeleteTarget(null);
        },
        onError: (err) => {
          setToast({ msg: SupplierListService.extractErrorMessage(err, "Failed to deactivate"), type: "error" });
          setDeleteTarget(null);
        },
      },
    );
  };

  const columns: ColumnConfig<SupplierListRecord>[] = [
    {
      key: "supplierCode",
      header: "Supplier Code",
      // colKey: "supplier_code",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: supplierCodeOptions,
      width: "110px",
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-foreground">{row.supplierCode || "—"}</span>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: supplierNameOptions,
      width: "180px",
      render: (_val, row) => (
        <button
          type="button"
          className="block group/name text-left w-full"
          onClick={() => router.push(`/masters/vendors/${row.supplierUuid}`)}
        >
          <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">{row.supplierName}</p>
        </button>
      ),
    },
    {
      key: "supplierType",
      header: "Supplier Type",
      sortable: false,
      filterable: true,
      filterType: "dropdown",
      filterOptions: supplierTypeOptions,
      width: "160px",
      render: (_val, row) => row.supplierType?.supplier_type_name || "—",
    },
    {
      key: "contactPerson",
      header: "Contact Person",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: contactPersonOptions,
      width: "140px",
      render: (_val, row) => row.contactPerson || "—",
    },
    {
      key: "mobile",
      header: "Mobile Number",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: mobileOptions,
      width: "140px",
      render: (_val, row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.mobileNumber ? `${row.mobileCountryCode} ${row.mobileNumber}` : "—"}
        </span>
      ),
    },
    {
      key: "gstNumber",
      header: "GST Number",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: gstinOptions,
      width: "150px",
      render: (_val, row) => (
        <span className="font-mono text-[11px]">{row.gstinNumber || "—"}</span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: createdByOptions,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdAt} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: updatedByOptions,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedAt} />
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: false,
      filterable: true,
      filterType: "dropdown",
      filterOptions: statusOptions,
      width: "110px",
      render: (_val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
      ),
    },
  ];

  const actions: ActionItemConfig<SupplierListRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/vendors/${row.supplierUuid}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/vendors/${row.supplierUuid}/edit`),
    },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  // const filtered = useMemo(() => {
  //   // let result = [...records];

  //   if (filters.search) {
  //     const q = String(filters.search).trim().toLowerCase();
  //     result = result.filter(
  //       (v) =>
  //         (v.supplierCode || "").toLowerCase().includes(q) ||
  //         v.supplierName.toLowerCase().includes(q) ||
  //         (v.vendorType || "").toLowerCase().includes(q) ||
  //         (v.contactPerson || "").toLowerCase().includes(q) ||
  //         v.mobile.includes(q) ||
  //         v.email.toLowerCase().includes(q) ||
  //         v.gstNumber.toLowerCase().includes(q)
  //     );
  //   }

  //   result = applyFilters(result, filters);

  //   if (sort.key && sort.direction !== "none") {
  //     result.sort((a, b) => {
  //       const av = String((a as unknown as Record<string, unknown>)[sort.key] ?? "");
  //       const bv = String((b as unknown as Record<string, unknown>)[sort.key] ?? "");
  //       const cmp = av.localeCompare(bv);
  //       return sort.direction === "asc" ? cmp : -cmp;
  //     });
  //   }

  //   return result;
  // }, [records, filters, sort]);

  // const paginated = useMemo(() => {
  //   const startOffset = (page - 1) * pageSize;
  //   return filtered.slice(startOffset, startOffset + pageSize);
  // }, [filtered, page, pageSize]);

  const exportMutation = useExportSuppliers();
  const handleExport = () => {
    exportMutation.mutate(
      { search: listParams.search, status: listParams.status, ordering: listParams.ordering, apiFilters: listParams.apiFilters },
      { onError: (err) => setToast({ msg: SupplierListService.extractErrorMessage(err, "Failed to export"), type: "error" }) },
    );
  };

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Supplier Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage supplier information for procurement and accounts payable</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Suppliers" value={total} icon={Building2} accent={true} />
          <MiniKPICard label="Active" value={items.filter((v) => v.status === "active").length} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={items.filter((v) => v.status === "inactive").length} icon={XCircle} accent={false} />
        </div>

        <MasterListing
          columns={columns}
          data={items}
          totalRecords={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={(next) => {
            setFilters(next);
            applyFilters(next);
          }}
          actions={actions}
          onAdd={() => router.push("/masters/vendors/new")}
          addLabel="Create Supplier"
          onExport={handleExport}
          emptyMessage="suppliers"
          searchPlaceholder="Search supplier code, name, type, contact, GST…"
          currentFilters={filters}
          currentSort={sort}
          onOpenFilter={handleOpenFilter}
        />
      </div>

      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                Deactivate Supplier?
              </DialogTitle>
              <DialogDescription className="pt-1 text-xs">
                <strong className="text-foreground">{deleteTarget.supplierName}</strong> will be marked as inactive.
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
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
