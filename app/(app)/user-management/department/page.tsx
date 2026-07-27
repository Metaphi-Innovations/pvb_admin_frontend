"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Eye,
  Edit2,
  Building2,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import DepartmentSheet from "./components/DepartmentSheet";
import DepartmentDetailSheet from "./components/DepartmentDetailSheet";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";
import {
  toDepartmentRecord,
  type Department,
  type DepartmentFormState,
} from "./department-data";
import { sortStateToOrdering } from "@/services/department-list.service";
import {
  useDepartments,
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  useToggleDepartmentStatus,
  useExportDepartments,
  useDepartmentFilterDropdown,
} from "@/hooks/user-management";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
  buildStatusFilter,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  bgClass?: string;
}

function KpiCard({ label, value, icon: Icon, bgClass = "bg-brand-600" }: KpiCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          bgClass,
        )}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

const COUNT_PARAMS = {
  page: 1,
  pageSize: 1,
  search: "",
  ordering: "",
};

export default function DepartmentPage() {
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewDept, setViewDept] = useState<Department | null>(null);
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Department | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () => mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.department),
    [appliedFilters],
  );
  const listStatus = useMemo(() => resolveListStatus(appliedFilters), [appliedFilters]);

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

  const listQuery = useDepartments(listParams);
  const detailQuery = useDepartment(viewId);
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const toggleStatusMutation = useToggleDepartmentStatus();
  const exportMutation = useExportDepartments();

  const allCountQuery = useDepartments({
    ...COUNT_PARAMS,
    status: "all",
    apiFilters: {},
  });
  const activeCountQuery = useDepartments({
    ...COUNT_PARAMS,
    status: "active",
    apiFilters: buildStatusFilter("active", "is_active"),
  });
  const inactiveCountQuery = useDepartments({
    ...COUNT_PARAMS,
    status: "inactive",
    apiFilters: buildStatusFilter("inactive", "is_active"),
  });

  const nameOptionsQuery = useDepartmentFilterDropdown("department_name", {
    enabled: isFilterOpen("name"),
  });
  const createdByOptionsQuery = useDepartmentFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdDate"),
  });
  const updatedByOptionsQuery = useDepartmentFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedDate"),
  });

  const nameOptions = useMemo(() => nameOptionsQuery.data ?? [], [nameOptionsQuery.data]);
  const createdByOptions = useMemo(
    () => createdByOptionsQuery.data ?? [],
    [createdByOptionsQuery.data],
  );
  const updatedByOptions = useMemo(
    () => updatedByOptionsQuery.data ?? [],
    [updatedByOptionsQuery.data],
  );
  const statusOptions = useMemo(
    () => [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
    [],
  );

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toDepartmentRecord),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "departments",
        notFoundMessage: "Department list endpoint not found.",
        serverMessage: "Server error while loading departments.",
      })
    : null;
  const saving = createMutation.isPending || updateMutation.isPending;

  const summary = useMemo(
    () => ({
      total: allCountQuery.data?.total ?? 0,
      active: activeCountQuery.data?.total ?? 0,
      inactive: inactiveCountQuery.data?.total ?? 0,
    }),
    [allCountQuery.data?.total, activeCountQuery.data?.total, inactiveCountQuery.data?.total],
  );

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, apiFilters, pageSize, sort.key, sort.direction]);

  useEffect(() => {
    if (!viewId) return;
    if (detailQuery.isError) {
      showToast(getErrorMessage(detailQuery.error, "Failed to load department details."), "error");
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setViewDept(toDepartmentRecord(detailQuery.data));
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error, showToast]);

  const openAdd = () => {
    setActiveDept(null);
    setFormError(null);
    setSheetMode("add");
  };

  const openEdit = (dept: Department) => {
    setActiveDept(dept);
    setFormError(null);
    setSheetMode("edit");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActiveDept(null);
    setFormError(null);
  };

  const openView = useCallback((dept: Department) => {
    if (!dept.departmentUuid) {
      showToast("Department id missing. Unable to load details.", "error");
      return;
    }
    setViewDept(dept);
    setViewId(dept.departmentUuid);
  }, [showToast]);

  const closeView = () => {
    setViewDept(null);
    setViewId(null);
  };

  const handleSave = (data: DepartmentFormState) => {
    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(
        {
          department_name: data.name,
          remark: data.remarks || null,
        },
        {
          onSuccess: () => {
            showToast("Department created successfully");
            setPage(1);
            closeSheet();
          },
          onError: (error) => {
            setFormError(getErrorMessage(error, "Failed to create department."));
          },
        },
      );
      return;
    }

    if (!activeDept?.departmentUuid) {
      setFormError("Department id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      {
        id: activeDept.departmentUuid,
        payload: {
          department_name: data.name,
          remark: data.remarks || null,
        },
      },
      {
        onSuccess: () => {
          showToast("Department updated successfully");
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update department."));
        },
      },
    );
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.departmentUuid;
    if (!statusTarget || !id) {
      showToast("Department id missing. Unable to update status.", "error");
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";
    toggleStatusMutation.mutate(id, {
      onSuccess: () => {
        showToast(`Department status updated to ${nextActive ? "Active" : "Inactive"}`);
      },
      onError: (error) => {
        showToast(getErrorMessage(error, "Failed to update department status."), "error");
      },
      onSettled: () => {
        setStatusTarget(null);
      },
    });
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: appliedSearch,
        status: listStatus,
        ordering,
        apiFilters,
      },
      {
        onSuccess: () => {
          showToast("Departments exported successfully");
        },
        onError: (error) => {
          showToast(getErrorMessage(error, "Failed to export departments"), "error");
        },
      },
    );
  };

  const columns: ColumnConfig<Department>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Department Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: nameOptions,
        render: (_val, row) => (
          <button
            className="text-xs font-semibold text-left transition-colors text-foreground hover:text-brand-600"
            onClick={() => openView(row)}
          >
            {row.name}
          </button>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        render: (_val, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => setStatusTarget(row)}
          />
        ),
      },
      {
        key: "createdDate",
        header: "Created",
        sortable: true,
        filterable: true,
        filterType: "audit",
        auditUserOptions: createdByOptions,
        render: (_val, row) => (
          <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />
        ),
      },
      {
        key: "updatedDate",
        header: "Updated",
        sortable: true,
        filterable: true,
        filterType: "audit",
        auditUserOptions: updatedByOptions,
        render: (_val, row) => (
          <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        sticky: true,
        render: (_val, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 z-[200]">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openView(row)} className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row)} className="cursor-pointer">
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [nameOptions, statusOptions, createdByOptions, openView],
  );

  return (
    <ListingContainer
      title="Department"
      titleIcon={Building2}
      metrics={
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Departments" value={summary.total} icon={Building2} bgClass="bg-brand-600" />
          <KpiCard label="Active" value={summary.active} icon={CheckCircle2} bgClass="bg-emerald-600" />
          <KpiCard label="Inactive" value={summary.inactive} icon={XCircle} bgClass="bg-slate-400" />
        </div>
      }
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<Department>
        columns={columns}
        data={records}
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
        emptyMessage="departments"
        searchPlaceholder="Search department…"
        onAdd={openAdd}
        addLabel="Add Department"
        onExport={handleExport}
        currentFilters={filters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />

      <DepartmentSheet
        open={sheetMode !== null}
        onClose={closeSheet}
        onSave={handleSave}
        dept={sheetMode === "edit" ? activeDept : null}
        saving={saving}
        formError={formError}
      />

      <DepartmentDetailSheet
        open={!!viewDept}
        onClose={closeView}
        dept={viewDept}
        onEdit={(dept) => {
          closeView();
          openEdit(dept);
        }}
      />

      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              {statusTarget?.status === "active"
                ? "Deactivate Department?"
                : "Activate Department?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground">{statusTarget.name}</strong> will be marked
                  as {statusTarget.status === "active" ? "inactive" : "active"}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
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
              className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
              onClick={confirmStatusChange}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
