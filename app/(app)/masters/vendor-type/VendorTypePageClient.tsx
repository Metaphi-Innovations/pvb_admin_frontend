"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  XCircle,
} from "lucide-react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import {
  ListingAuditCell,
  ListingStatusToggle,
  isActiveStatus,
} from "@/components/listing";
import {
  useSupplierTypes,
  useToggleSupplierTypeStatus,
  useExportSupplierTypes,
  useSupplierTypeFilterDropdown,
} from "@/hooks/masters";
import { sortStateToOrdering, type SupplierTypeListRecord } from "@/services/supplier-type.service";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { getMasterListErrorMessage, getErrorMessage } from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

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
        <XCircle className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VendorTypeMasterPage() {
  const router = useRouter();
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "supplierTypeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const apiFilters = useMemo(
    () => mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.supplierType),
    [appliedFilters],
  );

  const listStatus = useMemo(
    () => resolveListStatus(appliedFilters),
    [appliedFilters],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: appliedSearch,
      status: listStatus,
      apiFilters,
      ordering,
    }),
    [page, pageSize, appliedSearch, listStatus, apiFilters, ordering],
  );

  const listQuery = useSupplierTypes(listParams);
  const toggleStatusMutation = useToggleSupplierTypeStatus();
  const exportMutation = useExportSupplierTypes();

  const supplierTypeNameOptionsQuery = useSupplierTypeFilterDropdown("supplier_type_name", {
    enabled: isFilterOpen("supplierTypeName"),
  });
  const initialCodeOptionsQuery = useSupplierTypeFilterDropdown("initial_code", {
    enabled: isFilterOpen("initialCode"),
  });
  const descriptionOptionsQuery = useSupplierTypeFilterDropdown("description", {
    enabled: isFilterOpen("description"),
  });
  const statusOptionsQuery = useSupplierTypeFilterDropdown("is_active", {
    enabled: isFilterOpen("status"),
  });
  const createdByOptionsQuery = useSupplierTypeFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdBy"),
  });
  const updatedByOptionsQuery = useSupplierTypeFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedBy"),
  });

  const supplierTypeNameOptions = useMemo(
    () => supplierTypeNameOptionsQuery.data ?? [],
    [supplierTypeNameOptionsQuery.data],
  );
  const initialCodeOptions = useMemo(
    () => initialCodeOptionsQuery.data ?? [],
    [initialCodeOptionsQuery.data],
  );
  const descriptionOptions = useMemo(
    () => descriptionOptionsQuery.data ?? [],
    [descriptionOptionsQuery.data],
  );
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
  const createdByOptions = useMemo(
    () => createdByOptionsQuery.data ?? [],
    [createdByOptionsQuery.data],
  );
  const updatedByOptions = useMemo(
    () => updatedByOptionsQuery.data ?? [],
    [updatedByOptionsQuery.data],
  );

  const records = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;

  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
      resource: "supplier types",
      notFoundMessage: "Supplier type list endpoint not found.",
      serverMessage: "Server error while loading supplier types.",
    })
    : null;

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFilterChange = (next: FilterState) => {
    setFilters(next);
    applyFilters(next);
    setPage(1);
  };

  const updateStatus = (row: SupplierTypeListRecord) => {
    const uuid = row.supplierTypeUuid;
    if (!uuid) {
      setToast({ msg: "Supplier type id missing. Unable to update status.", type: "error" });
      return;
    }
    const nextActive = row.status?.toLowerCase() !== "active";
    toggleStatusMutation.mutate(
      { id: uuid, isActive: nextActive },
      {
        onSuccess: () =>
          setToast({
            msg: `Supplier type status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          }),
        onError: (error) =>
          setToast({
            msg: getErrorMessage(error, "Failed to update supplier type status."),
            type: "error",
          }),
      },
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      { search: appliedSearch, status: listStatus, ordering, apiFilters },
      {
        onError: (error) =>
          setToast({
            msg: getErrorMessage(error, "Failed to export supplier types."),
            type: "error",
          }),
      },
    );
  };

  const columns: ColumnConfig<SupplierTypeListRecord>[] = useMemo(
    () => [
      {
        key: "supplierTypeName",
        header: "Supplier Type Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: supplierTypeNameOptions,
        width: "220px",
        render: (_val, row) => (
          <Link
            href={`/masters/vendor-type/${row.supplierTypeUuid}`}
            className="text-xs font-semibold text-foreground hover:text-brand-700"
          >
            {row.supplierTypeName}
          </Link>
        ),
      },
      {
        key: "initialCode",
        header: "Initial Code",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: initialCodeOptions,
        width: "120px",
        render: (_val, row) => (
          <span className="font-mono text-xs font-medium text-foreground">{row.initialCode}</span>
        ),
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: descriptionOptions,
        width: "320px",
        render: (_val, row) => row.description || "—",
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "120px",
        render: (_val, row) => (
          <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => updateStatus(row)} />
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
          <ListingAuditCell name={row.createdBy} date={row.createdAt} variant="created" />
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
          <ListingAuditCell name={row.updatedBy} date={row.updatedAt} variant="updated" />
        ),
      },
    ],
    [
      supplierTypeNameOptions,
      initialCodeOptions,
      descriptionOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
    ],
  );

  const actions: ActionItemConfig<SupplierTypeListRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/vendor-type/${row.supplierTypeUuid}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/vendor-type/${row.supplierTypeUuid}/edit`),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Supplier Type Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage supplier type classifications used across procurement and accounts
          </p>
        </div>

        {listError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listError}
          </div>
        )}

        <MasterListing<SupplierTypeListRecord>
          columns={columns}
          data={records}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={handleFilterChange}
          actions={actions}
          onAdd={() => router.push("/masters/vendor-type/add")}
          addLabel="Add Supplier Type"
          onExport={handleExport}
          emptyMessage="supplier types"
          searchPlaceholder="Search supplier type name, initial code, description..."
          currentFilters={filters}
          currentSort={sort}
          onOpenFilter={handleOpenFilter}
        />
      </div>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
