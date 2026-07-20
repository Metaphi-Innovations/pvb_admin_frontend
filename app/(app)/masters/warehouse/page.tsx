"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Wrench,
  Lock,
  Eye,
  Edit2,
  ChevronDown,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { ListingAuditCell } from "@/components/listing";
import {
  useWarehouses,
  useToggleWarehouseStatus,
  useExportWarehouses,
  useWarehouseFilterDropdown,
} from "@/hooks/masters";
import { sortStateToOrdering, type WarehouseListRecord } from "@/services/warehouse-list.service";
import {
  buildListApiFilters,
  MASTER_FILTER_FIELD_MAPS,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { getMasterListErrorMessage, getErrorMessage } from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function formatStatus(status: string): string {
  if (status === "Under Maintenance" || status === "under_maintenance") return "Under Maintenance";
  if (status === "Closed" || status === "closed") return "Closed";
  if (status === "Active" || status === "active") return "Active";
  if (status === "Inactive" || status === "inactive") return "Inactive";
  return status;
}
type WarehouseStatusAction = "Active" | "Inactive" | "Under Maintenance" | "Closed";

function getActionVerb(action: WarehouseStatusAction, style: "title" | "body") {
  if (action === "Active") return style === "title" ? "Activate" : "active";
  if (action === "Inactive") return style === "title" ? "Deactivate" : "inactive";
  if (action === "Under Maintenance") return style === "title" ? "Mark Under Maintenance" : "under maintenance";
  return style === "title" ? "Close" : "closed";
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "Active" || status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "Inactive" || status === "inactive"
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : status === "Under Maintenance" || status === "under_maintenance"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-700";

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center justify-center whitespace-nowrap", cfg)}>
      {formatStatus(status)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastState {
  msg: string;
  type: "success" | "error";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WarehouseListPage() {
  const router = useRouter();
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "warehouseName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: WarehouseStatusAction;
    record: WarehouseListRecord;
  } | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const apiFilters = useMemo(
    () => buildListApiFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.warehouse, ["search"]),
    [appliedFilters],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: appliedSearch,
      status: "all",
      apiFilters,
      ordering,
    }),
    [page, pageSize, appliedSearch, apiFilters, ordering],
  );

  const listQuery = useWarehouses(listParams);
  const toggleStatusMutation = useToggleWarehouseStatus();
  const exportMutation = useExportWarehouses();

  const warehouseNameOptionsQuery = useWarehouseFilterDropdown("warehouse_name", {
    enabled: isFilterOpen("warehouseName"),
  });
  const districtOptionsQuery = useWarehouseFilterDropdown("district", {
    enabled: isFilterOpen("district"),
  });
  const operatedByOptionsQuery = useWarehouseFilterDropdown("operated_by", {
    enabled: isFilterOpen("operatedBy"),
  });
  const createdByOptionsQuery = useWarehouseFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdBy"),
  });
  const updatedByOptionsQuery = useWarehouseFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedBy"),
  });
  const stateOptionsQuery = useWarehouseFilterDropdown("state", {
    enabled: isFilterOpen("state"),
  });
  const cityOptionsQuery = useWarehouseFilterDropdown("city", {
    enabled: isFilterOpen("city"),
  });
  const gstNumberOptionsQuery = useWarehouseFilterDropdown("gst_number", {
    enabled: isFilterOpen("gstNumber"),
  });

  const warehouseNameOptions = useMemo(
    () => warehouseNameOptionsQuery.data ?? [],
    [warehouseNameOptionsQuery.data],
  );
  const districtOptions = useMemo(
    () => districtOptionsQuery.data ?? [],
    [districtOptionsQuery.data],
  );
  const operatedByOptions = useMemo(() => {
    if (operatedByOptionsQuery.data?.length) return operatedByOptionsQuery.data;
    return [
      { label: "Self", value: "Self" },
      { label: "C&F Agent", value: "C&F Agent" },
    ];
  }, [operatedByOptionsQuery.data]);
  const statusOptions = useMemo(
    () => [
      { label: "All", value: "all" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
    [],
  );
  const stateOptions = useMemo(
    () => stateOptionsQuery.data ?? [],
    [stateOptionsQuery.data],
  );
  const cityOptions = useMemo(
    () => cityOptionsQuery.data ?? [],
    [cityOptionsQuery.data],
  );
  const gstNumberOptions = useMemo(
    () => gstNumberOptionsQuery.data ?? [],
    [gstNumberOptionsQuery.data],
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
  const loading = listQuery.isFetching;

  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
      resource: "warehouses",
      notFoundMessage: "Warehouse list endpoint not found.",
      serverMessage: "Server error while loading warehouses.",
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
    const normalized: FilterState = { ...next };
    const statusVal = normalized.status;
    const statusToken = Array.isArray(statusVal)
      ? String(statusVal[0] ?? "").toLowerCase()
      : String(statusVal ?? "").toLowerCase();
    if (statusToken === "all") {
      delete normalized.status;
    }
    setFilters(normalized);
    applyFilters(normalized);
    setPage(1);
  };

  const handleStatusAction = (record: WarehouseListRecord, action: WarehouseStatusAction) => {
    setConfirmDialog({ action, record });
  };

  const confirmStatusChange = () => {
    if (!confirmDialog) return;
    const { action, record } = confirmDialog;
    const uuid = record.warehouseUuid;
    if (!uuid) {
      setToast({ msg: "Warehouse id missing.", type: "error" });
      setConfirmDialog(null);
      return;
    }
    toggleStatusMutation.mutate(
      { id: uuid, status: action },
      {
        onSuccess: () => {
          setToast({ msg: `Warehouse status updated to ${formatStatus(action)} successfully`, type: "success" });
          setConfirmDialog(null);
        },
        onError: (error) => {
          setToast({ msg: getErrorMessage(error, "Failed to update warehouse status."), type: "error" });
          setConfirmDialog(null);
        },
      },
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      { search: appliedSearch, status: "all", ordering, apiFilters },
      { onError: (error) => setToast({ msg: getErrorMessage(error, "Failed to export warehouses."), type: "error" }) },
    );
  };

  const columns: ColumnConfig<WarehouseListRecord>[] = useMemo(() => [
    {
      key: "warehouseName",
      header: "Warehouse Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: warehouseNameOptions,
      width: "200px",
      render: (_val, row) => (
        <Link href={`/masters/warehouse/${row.warehouseUuid}`} className="block group/name">
          <p className="text-xs font-semibold leading-4 text-foreground group-hover/name:text-brand-700">{row.warehouseName}</p>
        </Link>
      ),
    },
    {
      key: "gstNumber",
      header: "GST Number",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: gstNumberOptions,
      width: "150px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.gstNumber || "—"}</span>,
    },
    {
      key: "state",
      header: "State",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: stateOptions,
      width: "130px",
      render: (_val, row) => row.state || "—",
    },
    {
      key: "district",
      header: "District",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: districtOptions,
      width: "130px",
      render: (_val, row) => row.district || "—",
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: cityOptions,
      width: "120px",
      render: (_val, row) => row.city || "—",
    },
    {
      key: "pincode",
      header: "Pincode",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "90px",
      render: (_val, row) => <span className="font-mono text-xs text-foreground">{row.pincode || "—"}</span>,
    },
    {
      key: "operatedBy",
      header: "Operated By",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: operatedByOptions,
      width: "110px",
      render: (_val, row) =>
        row.operatedBy === "C&F Agent" && row.cfAgentId
          ? `C&F Agent`
          : (row.operatedBy || "—"),
    },
    {
      key: "status",
      header: "Status",
      sortable: false,
      filterable: true,
      filterType: "dropdown",
      filterOptions: statusOptions,
      width: "160px",
      render: (_val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="inline-flex items-center gap-1.5 focus:outline-none pt-0.5">
              <StatusBadge status={row.status} />
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-white border shadow-lg border-border">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Status Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {row.status === "Active" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-slate-700 hover:text-slate-900"
                  onClick={() => handleStatusAction(row, "Inactive")}
                >
                  <XCircle className="w-3.5 h-3.5" /> Deactivate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                  onClick={() => handleStatusAction(row, "Under Maintenance")}
                >
                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs text-red-700 cursor-pointer hover:text-red-900"
                  onClick={() => handleStatusAction(row, "Closed")}
                >
                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                </DropdownMenuItem>
              </>
            )}
            {row.status === "Inactive" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                  onClick={() => handleStatusAction(row, "Active")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                  onClick={() => handleStatusAction(row, "Under Maintenance")}
                >
                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs text-red-700 cursor-pointer hover:text-red-900"
                  onClick={() => handleStatusAction(row, "Closed")}
                >
                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                </DropdownMenuItem>
              </>
            )}
            {row.status === "Under Maintenance" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                  onClick={() => handleStatusAction(row, "Active")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-slate-700 hover:text-slate-900"
                  onClick={() => handleStatusAction(row, "Inactive")}
                >
                  <XCircle className="w-3.5 h-3.5" /> Deactivate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs text-red-700 cursor-pointer hover:text-red-900"
                  onClick={() => handleStatusAction(row, "Closed")}
                >
                  <Lock className="w-3.5 h-3.5" /> Mark as Closed
                </DropdownMenuItem>
              </>
            )}
            {row.status === "Closed" && (
              <>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-emerald-700 hover:text-emerald-900"
                  onClick={() => handleStatusAction(row, "Active")}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-xs cursor-pointer text-amber-700 hover:text-amber-900"
                  onClick={() => handleStatusAction(row, "Under Maintenance")}
                >
                  <Wrench className="w-3.5 h-3.5" /> Mark as Under Maintenance
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
    {
      key: "createdBy",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: createdByOptions,
      width: "120px",
      render: (_val, row) => <ListingAuditCell name={row.createdBy} date={row.createdAt} variant="created" />,
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: updatedByOptions,
      width: "120px",
      render: (_val, row) => <ListingAuditCell name={row.updatedBy} date={row.updatedAt} variant="updated" />,
    },
  ], [
    warehouseNameOptions,
    districtOptions,
    operatedByOptions,
    statusOptions,
    stateOptions,
    cityOptions,
    gstNumberOptions,
    createdByOptions,
    updatedByOptions,
  ]);

  const actions: ActionItemConfig<WarehouseListRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/warehouse/${row.warehouseUuid}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/warehouse/${row.warehouseUuid}/edit`),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Warehouse Master</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage warehouse locations and operations
          </p>
        </div>

        {listError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listError}
          </div>
        )}

        <MasterListing<WarehouseListRecord>
          columns={columns}
          data={records}
          loading={loading}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={handleFilterChange}
          actions={actions}
          onAdd={() => router.push("/masters/warehouse/add")}
          addLabel="Add Warehouse"
          onExport={handleExport}
          emptyMessage="warehouses"
          searchPlaceholder="Search name, GST, state, city..."
          currentFilters={filters}
          currentSort={sort}
          onOpenFilter={handleOpenFilter}
        />
      </div>

      {confirmDialog && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
          <DialogContent className="max-w-sm bg-white border shadow-xl border-border rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 border rounded-lg bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                {getActionVerb(confirmDialog.action, "title")} Warehouse?
              </DialogTitle>
              <DialogDescription className="pt-1">
                This will mark{" "}
                {getActionVerb(confirmDialog.action, "body")}{" "}
                &quot;{confirmDialog.record.warehouseName}&quot;?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmDialog(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
                onClick={confirmStatusChange}
                disabled={toggleStatusMutation.isPending}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium animate-in slide-in-from-top-2 fade-in-0 duration-300",
          toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
        )}>
          <Check className="flex-shrink-0 w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
