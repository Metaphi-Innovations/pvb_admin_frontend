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
import {
  useSuppliers,
  useSupplierSummary,
  useToggleSupplierStatus,
  useExportSuppliers,
  useSupplierFilterDropdown,
} from "@/hooks/masters";
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
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTarget, setStatusTarget] = useState<SupplierListRecord | null>(null);

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
  const { data: summary } = useSupplierSummary();
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatusMutation = useToggleSupplierStatus();

  const requestStatusToggle = (record: SupplierListRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    if (!statusTarget) return;
    const nextActive = statusTarget.status !== "active";
    toggleStatusMutation.mutate(
      { id: statusTarget.supplierUuid, isActive: nextActive },
      {
        onSuccess: () =>
          setToast({
            msg: `Vendor status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          }),
        onError: (err) =>
          setToast({
            msg: SupplierListService.extractErrorMessage(err, "Failed to update status"),
            type: "error",
          }),
        onSettled: () => setStatusTarget(null),
      },
    );
  };

  const columns: ColumnConfig<SupplierListRecord>[] = [
    {
      key: "supplierCode",
      header: "Supplier Code",
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
      sortable: true,
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
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: statusOptions,
      width: "110px",
      render: (_val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => requestStatusToggle(row)} />
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      filterable: true,
      filterType: "date",
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
      filterType: "date",
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedAt} />
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
  ];

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
          <MiniKPICard label="Total Suppliers" value={summary?.total ?? total} icon={Building2} accent={true} />
          <MiniKPICard label="Active" value={summary?.active ?? 0} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={summary?.inactive ?? 0} icon={XCircle} accent={false} />
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
          onPageJumpError={(msg) => setToast({ msg, type: "error" })}
        />
      </div>

      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              {statusTarget?.status === "active" ? "Deactivate Supplier?" : "Activate Supplier?"}
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              {statusTarget && (
                <>
                  <strong className="text-foreground">{statusTarget.supplierName}</strong> will be marked
                  as {statusTarget.status === "active" ? "inactive" : "active"}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-8 text-xs text-white",
                statusTarget?.status === "active"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700",
              )}
              onClick={confirmStatusChange}
              disabled={toggleStatusMutation.isPending}
            >
              {statusTarget?.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
