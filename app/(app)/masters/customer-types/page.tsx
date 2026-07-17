"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  X,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadCustomerTypes, saveCustomerTypes, type CustomerTypeRecord } from "./customer-type-data";
import {
  useCustomerTypes,
  useToggleCustomerTypeStatus,
  useExportCustomerTypes,
  useCustomerTypeFilterDropdown,
} from "@/hooks/masters";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingUserCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

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

function toCustomerTypeRow(item: {
  id: number;
  customerTypeId: string;
  initialCode: string;
  customerType: string;
  description: string;
  status: "active" | "inactive";
  documents: { id: string; title: string }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): CustomerTypeRecord {
  return {
    id: item.id,
    customerTypeId: item.customerTypeId,
    customerTypeCode: item.initialCode,
    initialCode: item.initialCode,
    customerType: item.customerType,
    description: item.description,
    documentTypes: item.documents.map((doc, idx) => ({
      id: `DOC-${idx + 1}`,
      documentTypeId: doc.id,
      documentName: doc.title,
    })),
    status: item.status,
    createdBy: item.createdBy || "—",
    createdDate: item.createdAt ? item.createdAt.slice(0, 10) : "",
    updatedBy: item.updatedBy || "—",
    updatedDate: item.updatedAt ? item.updatedAt.slice(0, 10) : "",
  };
}

function routeId(row: CustomerTypeRecord): string {
  return row.customerTypeId || String(row.id);
}

export default function CustomerTypesPage() {
  const router = useRouter();
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "customerType", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerTypeRecord | null>(null);

  const apiFilters = useMemo(
    () => mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.customerType),
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
      ordering: "",
    }),
    [page, pageSize, appliedSearch, listStatus, apiFilters],
  );

  const listQuery = useCustomerTypes(listParams);
  const toggleStatusMutation = useToggleCustomerTypeStatus();
  const exportMutation = useExportCustomerTypes();

  const customerTypeOptionsQuery = useCustomerTypeFilterDropdown("customer_type_name", {
    enabled: isFilterOpen("customerType"),
  });
  const initialCodeOptionsQuery = useCustomerTypeFilterDropdown("customer_initial_code", {
    enabled: isFilterOpen("initialCode"),
  });
  const descriptionOptionsQuery = useCustomerTypeFilterDropdown("description", {
    enabled: isFilterOpen("description"),
  });
  const statusOptionsQuery = useCustomerTypeFilterDropdown("is_active", {
    enabled: isFilterOpen("status"),
  });
  const createdByOptionsQuery = useCustomerTypeFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdBy"),
  });
  const updatedByOptionsQuery = useCustomerTypeFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedBy"),
  });

  const customerTypeOptions = useMemo(
    () => customerTypeOptionsQuery.data ?? [],
    [customerTypeOptionsQuery.data],
  );
  const initialCodeOptions = useMemo(
    () => initialCodeOptionsQuery.data ?? [],
    [initialCodeOptionsQuery.data],
  );
  const descriptionOptions = useMemo(
    () => descriptionOptionsQuery.data ?? [],
    [descriptionOptionsQuery.data],
  );
  const statusOptions = useMemo(() => {
    if (statusOptionsQuery.data?.length) return statusOptionsQuery.data;
    return [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];
  }, [statusOptionsQuery.data]);
  const createdByOptions = useMemo(
    () => createdByOptionsQuery.data ?? [],
    [createdByOptionsQuery.data],
  );
  const updatedByOptions = useMemo(
    () => updatedByOptionsQuery.data ?? [],
    [updatedByOptionsQuery.data],
  );

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toCustomerTypeRow),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, { resource: "customer types" })
    : null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = useCallback(
    (record: CustomerTypeRecord) => {
      const customerTypeId = routeId(record);
      if (!customerTypeId) {
        setToast({ msg: "Customer type id missing. Unable to update status.", type: "error" });
        return;
      }
      toggleStatusMutation.mutate(customerTypeId, {
        onSuccess: () => {
          setToast({
            msg: `Customer type status updated to ${record.status === "active" ? "Inactive" : "Active"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update customer type status."),
            type: "error",
          });
        },
      });
    },
    [toggleStatusMutation],
  );

  const columns: ColumnConfig<CustomerTypeRecord>[] = [
    {
      key: "customerType",
      header: "Customer Type Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: customerTypeOptions,
      width: "200px",
      render: (val, row) => (
        <Link href={`/masters/customer-types/${routeId(row)}`} className="font-semibold text-foreground hover:text-brand-700">
          {row.customerType}
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
        <span className="font-mono font-medium text-foreground">{row.initialCode}</span>
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
      render: (val, row) => row.description || "—",
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
        <ListingUserCell name={row.createdBy} date={row.createdDate} />
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
        <ListingUserCell name={row.updatedBy} date={row.updatedDate} />
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: statusOptions,
      width: "120px",
      render: (val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => toggleStatus(row)}
        />
      ),
    },
  ];

  const actions: ActionItemConfig<CustomerTypeRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/customer-types/${routeId(row)}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/customer-types/${routeId(row)}/edit`),
    },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const displayRecords = useMemo(() => {
    if (!sort.key || sort.direction === "none") return records;
    return [...records].sort((a, b) => {
      const aVal = String(a[sort.key as keyof CustomerTypeRecord] ?? "").toLowerCase();
      const bVal = String(b[sort.key as keyof CustomerTypeRecord] ?? "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort]);

    useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadCustomerTypes().filter((r) => r.id !== deleteTarget.id);
    saveCustomerTypes(list);
    setDeleteTarget(null);
    setToast({ msg: "Customer Type deleted successfully", type: "success" });
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: appliedSearch,
        status: listStatus,
        apiFilters,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Customer Types exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export customer types"),
            type: "error",
          });
        },
      },
    );
  };

  const handleAdd = () => {
    router.push("/masters/customer-types/add");
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customer Type Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage types of customers used in the system</p>
        </div>

        {listError ? <p className="text-xs text-red-600">{listError}</p> : null}

        <MasterListing<CustomerTypeRecord>
          columns={columns}
          data={displayRecords}
          loading={loading}
          totalRecords={totalRecords}
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
          onAdd={handleAdd}
          addLabel="Add Customer Type"
          onExport={handleExport}
          emptyMessage="customer types"
          searchPlaceholder="Search customer type, initial code, description..."
          currentFilters={filters}
          currentSort={sort}
          onOpenFilter={handleOpenFilter}
        />
      </div>

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
