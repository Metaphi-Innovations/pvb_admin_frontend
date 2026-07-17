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
import { ListingUserCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import {
  useSupplierTypes,
  useToggleSupplierTypeStatus,
  useExportSupplierTypes,
} from "@/hooks/masters";
import { sortStateToOrdering, type SupplierTypeListRecord } from "@/services/supplier-type.service";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
  type FieldMapper,
} from "@/lib/masters/list-api-filters";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
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
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "supplierTypeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // ---- ordering / api-filters / status ----
  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(debouncedFilters, (MASTER_FILTER_FIELD_MAPS as unknown as Record<string, Record<string, FieldMapper>>).supplierType, {}),
    [debouncedFilters],
  );

  const listStatus = useMemo(
    () => resolveListStatus(debouncedFilters, "all"),
    [debouncedFilters],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      status: listStatus,
      apiFilters,
      ordering,
    }),
    [page, pageSize, debouncedSearch, listStatus, apiFilters, ordering],
  );

  // ---- queries / mutations ----
  const listQuery = useSupplierTypes(listParams);
  const toggleStatusMutation = useToggleSupplierTypeStatus();
  const exportMutation = useExportSupplierTypes();

  const records = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;

  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
      resource: "supplier types",
      notFoundMessage: "Supplier type list endpoint not found.",
      serverMessage: "Server error while loading supplier types.",
    })
    : null;

  // ---- reset page on filter / sort change ----
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  // ---- auto-dismiss toast ----
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- status toggle ----
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

  // ---- export ----
  const handleExport = () => {
    exportMutation.mutate(
      { search: debouncedSearch, status: listStatus, ordering, apiFilters },
      {
        onError: (error) =>
          setToast({
            msg: getErrorMessage(error, "Failed to export supplier types."),
            type: "error",
          }),
      },
    );
  };

  // ---- columns ----
  const columns: ColumnConfig<SupplierTypeListRecord>[] = [
    {
      key: "supplierTypeName",
      header: "Supplier Type Name",
      sortable: true,
      filterable: true,
      filterType: "text",
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
      filterType: "text",
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
      filterType: "text",
      width: "320px",
      render: (_val, row) => row.description || "—",
    },
    {
      key: "status",
      header: "Status",
      sortable: false,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      width: "120px",
      render: (_val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => updateStatus(row)} />
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
  ];

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
          onFilterChange={(f) => { setFilters(f); setPage(1); }}
          actions={actions}
          onAdd={() => router.push("/masters/vendor-type/add")}
          addLabel="Add Supplier Type"
          onExport={handleExport}
          emptyMessage="supplier types"
          searchPlaceholder="Search supplier type name, initial code, description..."
          currentFilters={filters}
          currentSort={sort}

        />
      </div>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
