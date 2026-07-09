"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Eye, Edit2, MoreHorizontal, Users, CheckCircle2, XCircle, X, AlertTriangle, Key,
} from "lucide-react";
import { formatEmployeeMobile } from "./employee-data";
import { toUserRecord, type UserRecord } from "./user-api-data";
import { EmployeeListingStatusCell } from "./components/EmployeeListingStatusCell";
import { ListingUserCell } from "@/components/listing/ListingUserCell";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import {
  useUsers,
  useToggleUserStatus,
  useExportUsers,
  useUserFilterDropdown,
} from "@/hooks/user-management";
import { sortStateToOrdering } from "@/services/user-list.service";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
  buildStatusFilter,
} from "@/lib/masters/list-api-filters";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

type StatusTab = "all" | "active" | "inactive";
const USER_TAB_KEY = "user-list-status-tab";

interface ToastState { msg: string; type: "success" | "error" }

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(USER_TAB_KEY);
  return v === "active" || v === "inactive" ? v : "all";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
        : <XCircle className="flex-shrink-0 w-4 h-4" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = "Confirm",
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function extractAuditFilter(value: unknown): { user: string; fromDate: string; toDate: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { user: "", fromDate: "", toDate: "" };
  }
  const record = value as Record<string, unknown>;
  return {
    user: typeof record.user === "string" ? record.user.trim() : "",
    fromDate: typeof record.fromDate === "string" ? record.fromDate : "",
    toDate: typeof record.toDate === "string" ? record.toDate : "",
  };
}

export default function EmployeeListingPage() {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "employeeId", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null);

  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters, 400);

  const roleOptionsQuery = useUserFilterDropdown("role__role_name");
  const departmentOptionsQuery = useUserFilterDropdown("department__department_name");
  const statusOptionsQuery = useUserFilterDropdown("is_active");
  const createdByOptionsQuery = useUserFilterDropdown("created_by_user__username");
  const updatedByOptionsQuery = useUserFilterDropdown("updated_by_user__username");

  const roleOptions = roleOptionsQuery.data ?? [];
  const departmentOptions = departmentOptionsQuery.data ?? [];
  const statusOptions = statusOptionsQuery.data ?? [];
  const createdByOptions = createdByOptionsQuery.data ?? [];
  const updatedByOptions = updatedByOptionsQuery.data ?? [];

  const listStatus = resolveListStatus(debouncedFilters, statusTab);
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.user, {
        ...buildStatusFilter(listStatus),
      }),
    [debouncedFilters, listStatus],
  );

  const listParams: MasterListKeyParams = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      ordering: sortStateToOrdering(sort.key, sort.direction),
      status: listStatus,
      apiFilters,
    }),
    [page, pageSize, debouncedSearch, sort.key, sort.direction, listStatus, apiFilters],
  );

  const listQuery = useUsers(listParams);
  const toggleStatusMutation = useToggleUserStatus();
  const exportMutation = useExportUsers();

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toUserRecord),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;

  useEffect(() => {
    setStatusTab(readStoredStatusTab());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize, statusTab, sort.key, sort.direction]);

  const stats = useMemo(() => {
    const active = records.filter((r) => r.status === "active").length;
    const inactive = records.filter((r) => r.status === "inactive").length;
    return { total: totalRecords, active, inactive };
  }, [records, totalRecords]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(USER_TAB_KEY, next);
    setPage(1);
  };

  const handleStatusToggleRequest = (record: UserRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.userUuid;
    if (!statusTarget || !id) {
      setToast({ msg: "User id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";
    toggleStatusMutation.mutate(
      { id, active: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: `User ${nextActive ? "activated" : "deactivated"} successfully`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update user status."),
            type: "error",
          });
        },
        onSettled: () => setStatusTarget(null),
      },
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: debouncedSearch,
        status: listStatus,
        ordering: sortStateToOrdering(sort.key, sort.direction),
        apiFilters,
      },
      {
        onSuccess: () => setToast({ msg: "Users exported successfully", type: "success" }),
        onError: (error) =>
          setToast({ msg: getErrorMessage(error, "Failed to export users."), type: "error" }),
      },
    );
  };

  const columns: ColumnConfig<UserRecord>[] = useMemo(
    () => [
      {
        key: "employeeId",
        header: "Employee ID",
        sortable: true,
        render: (_val, row) => (
          <span className="font-mono text-xs font-semibold text-brand-700">{row.employeeId}</span>
        ),
      },
      {
        key: "fullName",
        header: "Employee Name",
        sortable: true,
        render: (_val, row) => (
          <p className="text-xs font-semibold truncate text-foreground">{row.fullName}</p>
        ),
      },
      {
        key: "email",
        header: "Email ID",
        sortable: true,
        render: (_val, row) => (
          <span className="text-xs text-foreground truncate">{row.email}</span>
        ),
      },
      {
        key: "mobile",
        header: "Mobile Number",
        sortable: true,
        render: (_val, row) => (
          <span className="text-xs font-mono text-foreground">{formatEmployeeMobile(row.mobile)}</span>
        ),
      },
      {
        key: "role",
        header: "Role",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: roleOptions,
        render: (_val, row) => (
          <span className="text-xs text-foreground">{row.role || "—"}</span>
        ),
      },
      {
        key: "department",
        header: "Department",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: departmentOptions,
        render: (_val, row) => (
          <span className="text-xs text-foreground">{row.department || "—"}</span>
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
          <EmployeeListingStatusCell
            status={row.status}
            employee={row as never}
            onToggleRequest={
              row.status === "active" || row.status === "inactive"
                ? () => handleStatusToggleRequest(row)
                : undefined
            }
          />
        ),
      },
      {
        key: "createdBy",
        header: "Created By",
        sortable: true,
        filterable: true,
        filterType: "audit",
        auditUserOptions: createdByOptions,
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
        render: (_val, row) => (
          <ListingUserCell name={row.updatedBy} date={row.updatedDate} />
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
              <DropdownMenuItem
                onClick={() => router.push(`/user-management/employee/${row.userUuid}`)}
                className="cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 mr-2" /> View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/user-management/employee/${row.userUuid}/edit`)}
                className="cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      roleOptions,
      departmentOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
      router,
    ],
  );

  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "users",
        notFoundMessage: "User list endpoint not found.",
        serverMessage: "Server error while loading users.",
      })
    : null;

  return (
    <ListingContainer
      title="User"
      titleIcon={Users}
      tabs={[
        { value: "all", label: `All (${stats.total})` },
        { value: "active", label: `Active (${stats.active})` },
        { value: "inactive", label: `Inactive (${stats.inactive})` },
      ]}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
      metrics={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total Users</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-600">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.active}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-slate-400">
              <XCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.inactive}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Inactive</p>
            </div>
          </div>
        </div>
      }
    >
      <div>
        {listError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {listError}
          </div>
        )}
        <MasterListing<UserRecord>
          columns={columns}
          data={records}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          emptyMessage="users"
          searchPlaceholder="Search by Employee ID, Name, Mobile, or Email…"
          onAdd={() => router.push("/user-management/employee/add")}
          addLabel="Add User"
          onExport={handleExport}
          currentFilters={filters}
          currentSort={sort}
          loading={listQuery.isFetching || isDebouncing}
        />
      </div>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        title={statusTarget?.status === "active" ? "Deactivate User" : "Activate User"}
        description={
          statusTarget?.status === "active"
            ? "Are you sure you want to deactivate this user?"
            : "Are you sure you want to activate this user?"
        }
        confirmLabel={statusTarget?.status === "active" ? "Deactivate" : "Activate"}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
