"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { isPostalMasterSuperAdmin } from "@/lib/geography/config";
import { MasterListing } from "@/components/listing/MasterListing";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";
import {
  ColumnConfig,
  FilterState,
  SortState,
  ActionItemConfig,
} from "@/components/listing/types";
import {
  sortStateToOrdering,
  type PostalListRecord,
} from "@/services/postal-master-list.service";
import {
  useCreatePostalMapping,
  useDeletePostalMapping,
  useExportPostalMaster,
  usePostalLookupDistricts,
  usePostalLookupStates,
  usePostalMasterList,
  usePostalMasterSummary,
  useTogglePostalMappingStatus,
} from "@/hooks/masters";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import { PostalMappingViewDialog } from "./PostalMappingViewDialog";
import { PostalMappingFormDialog } from "./PostalMappingFormDialog";

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
      {toast.type === "success" ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function firstFilterValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export function PostalLocationMasterTab(props: {
  onWorkflowChange?: () => void;
} = {}) {
  const { onWorkflowChange } = props;
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewRecord, setViewRecord] = useState<PostalListRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<PostalListRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PostalListRecord | null>(null);
  const canManagePostal = isPostalMasterSuperAdmin();

  const showToast = useCallback(
    (msg: string, type: "success" | "error" = "success") => setToast({ msg, type }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const statesQuery = usePostalLookupStates();
  const allDistrictsQuery = usePostalLookupDistricts();
  const districtsQuery = usePostalLookupDistricts(stateFilter || undefined);
  const summaryQuery = usePostalMasterSummary();

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const apiFilters = useMemo(() => {
    const next: Record<string, unknown> = {};
    if (stateFilter) next.state_id = stateFilter;
    if (districtFilter) next.district_id = districtFilter;

    // Merge MasterListing column filters
    Object.entries(filters).forEach(([key, val]) => {
      const filterValue = firstFilterValue(val);
      if (filterValue !== undefined && filterValue !== null && filterValue !== "") {
        if (key === "status") {
          // Status column filter
          if (filterValue === "active") next.status = true;
          else if (filterValue === "inactive") next.status = false;
        } else {
          next[key] = filterValue;
        }
      }
    });

    return next;
  }, [stateFilter, districtFilter, filters]);

  const effectiveStatus = useMemo<"all" | "active" | "inactive">(() => {
    const columnStatus = firstFilterValue(filters.status);
    if (columnStatus === "active") return "active";
    if (columnStatus === "inactive") return "inactive";
    return statusFilter;
  }, [statusFilter, filters.status]);

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: debouncedSearch.trim(),
      status: effectiveStatus,
      apiFilters,
      ordering,
    }),
    [page, pageSize, debouncedSearch, effectiveStatus, apiFilters, ordering],
  );

  const listQuery = usePostalMasterList(listParams);
  const toggleStatusMutation = useTogglePostalMappingStatus();
  const createMappingMutation = useCreatePostalMapping();
  const deleteMappingMutation = useDeletePostalMapping();
  const exportMutation = useExportPostalMaster();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, districtFilter, statusFilter, filters, sort, pageSize]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      stateFilter ||
      districtFilter ||
      statusFilter !== "all" ||
      Object.keys(filters).length,
  );

  const clearFilters = () => {
    setSearch("");
    setStateFilter("");
    setDistrictFilter("");
    setStatusFilter("all");
    setFilters({});
  };

  const confirmStatusToggle = useCallback(async () => {
    if (!statusConfirmTarget) return;
    try {
      await toggleStatusMutation.mutateAsync(statusConfirmTarget.mappingId);
      setStatusConfirmTarget(null);
      onWorkflowChange?.();
      showToast(
        `Postal mapping ${statusConfirmTarget.status === "active" ? "deactivated" : "activated"}.`,
      );
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to update status."), "error");
    }
  }, [statusConfirmTarget, toggleStatusMutation, onWorkflowChange, showToast]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMappingMutation.mutateAsync(deleteTarget.mappingId);
      setDeleteTarget(null);
      onWorkflowChange?.();
      showToast("Postal mapping deleted.");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete mapping."), "error");
    }
  }, [deleteTarget, deleteMappingMutation, onWorkflowChange, showToast]);

  const handleExport = useCallback(async () => {
    try {
      await exportMutation.mutateAsync({
        search: debouncedSearch.trim(),
        status: statusFilter,
        ordering,
        apiFilters,
      });
      showToast("Export started.");
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to export."), "error");
    }
  }, [
    exportMutation,
    debouncedSearch,
    statusFilter,
    ordering,
    apiFilters,
    showToast,
  ]);

  const actions = useMemo<ActionItemConfig<PostalListRecord>[]>(() => {
    const items: ActionItemConfig<PostalListRecord>[] = [
      { label: "View", action: "view", icon: Eye, onClick: (row) => setViewRecord(row) },
    ];
    if (canManagePostal) {
      items.push({
        label: "Delete",
        action: "delete",
        icon: Trash2,
        onClick: (row) => setDeleteTarget(row),
      });
    }
    return items;
  }, [canManagePostal]);

  const columns = useMemo<ColumnConfig<PostalListRecord>[]>(
    () => [
      {
        key: "pincode",
        header: "Pincode",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "120px",
        render: (v) => <span className="font-mono text-xs font-semibold">{v}</span>,
      },
      {
        key: "stateName",
        header: "State",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: (statesQuery.data ?? []).map((s) => ({ label: s.label, value: s.label })),
        width: "150px",
        render: (v) => <span className="text-xs">{v || "—"}</span>,
      },
      {
        key: "districtName",
        header: "District",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: (allDistrictsQuery.data ?? []).map((d) => ({ label: d.label, value: d.label })),
        width: "150px",
        render: (v) => <span className="text-xs">{v || "—"}</span>,
      },
      {
        key: "city",
        header: "Location",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "180px",
        render: (v, row) => (
          <span className="text-xs font-medium">
            {v || "—"}
            {row.locationType ? (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({row.locationType === "CITY" ? "City" : "Village"})
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "120px",
        filterable: true,
        filterType: "dropdown",
        filterOptions: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ],
        truncate: false,
        render: (_v, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => setStatusConfirmTarget(row)}
          />
        ),
      },
    ],
    [statesQuery.data, allDistrictsQuery.data],
  );

  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalMappings = summaryQuery.data?.totalMappings ?? 0;
  const loading = listQuery.isLoading || listQuery.isFetching;
  const listError = listQuery.error
    ? getMasterListErrorMessage(listQuery.error, { resource: "postal mappings" })
    : null;

  return (
    <div className="space-y-3">
      {listError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {listError}
        </div>
      )}
      {totalMappings > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          Showing results from{" "}
          <span className="font-semibold text-foreground">
            {totalMappings.toLocaleString()}
          </span>{" "}
          postal mappings
          {summaryQuery.data
            ? ` (${summaryQuery.data.citiesLinked} cities, ${summaryQuery.data.villagesLinked} villages linked)`
            : ""}
          .
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base font-semibold">Postal Master</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canManagePostal && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add Mapping
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={exportMutation.isPending}
            onClick={() => void handleExport()}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-xs rounded-lg"
            placeholder="Search pincode, state, district, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={stateFilter || "__all__"}
          onValueChange={(v) => {
            setStateFilter(v === "__all__" ? "" : v);
            setDistrictFilter("");
          }}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              All States
            </SelectItem>
            {(statesQuery.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={districtFilter || "__all__"}
          onValueChange={(v) => setDistrictFilter(v === "__all__" ? "" : v)}
          disabled={!stateFilter}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="District" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              All Districts
            </SelectItem>
            {(districtsQuery.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "all" | "active" | "inactive")
          }
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Status
            </SelectItem>
            <SelectItem value="active" className="text-xs">
              Active
            </SelectItem>
            <SelectItem value="inactive" className="text-xs">
              Inactive
            </SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground gap-1"
            onClick={clearFilters}
          >
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      <MasterListing<PostalListRecord>
        columns={columns}
        data={rows}
        loading={loading}
        totalRecords={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        hideSearch
        emptyMessage="No postal mappings found"
        currentFilters={filters}
        currentSort={sort}
        actions={actions}
      />

      <PostalMappingViewDialog
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        record={viewRecord}
      />
      <PostalMappingFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        saving={createMappingMutation.isPending}
        onSubmit={async (payload) => {
          await createMappingMutation.mutateAsync(payload);
          setFormOpen(false);
          onWorkflowChange?.();
          showToast("Postal mapping added.");
        }}
        onError={(msg) => showToast(msg, "error")}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <Dialog
        open={!!statusConfirmTarget}
        onOpenChange={() => setStatusConfirmTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Change Status
            </DialogTitle>
            <DialogDescription>
              Change status for pincode {statusConfirmTarget?.pincode}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={toggleStatusMutation.isPending}
              onClick={() => void confirmStatusToggle()}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 border border-red-200">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              Delete Mapping
            </DialogTitle>
            <DialogDescription>
              Remove mapping for {deleteTarget?.pincode} → {deleteTarget?.city}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
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
              variant="destructive"
              className="h-8 text-xs"
              disabled={deleteMappingMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
