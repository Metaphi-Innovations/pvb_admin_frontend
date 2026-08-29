"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Edit2, Eye, Gift, X } from "lucide-react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ListingTruncateCell } from "@/components/listing/ListingTruncateCell";
import {
  ColumnConfig,
  SortState,
  ActionItemConfig,
} from "@/components/listing/types";
import {
  ListingAuditCell,
  ListingStatusToggle,
  isActiveStatus,
} from "@/components/listing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useSchemes,
  useToggleSchemeStatus,
  useExportSchemes,
  useSchemeFilterDropdown,
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
import {
  sortStateToOrdering,
  APPROVAL_STATUS_LABELS,
  type SchemeApprovalStatus,
  type SchemeListRecord,
} from "@/services/scheme-list.service";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

type SchemeListTab =
  | "all"
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected";

const SCHEME_LIST_TABS: { value: SchemeListTab; label: string; approvalStatus?: SchemeApprovalStatus }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft", approvalStatus: "DRAFT" },
  { value: "pending_approval", label: "Pending Approval", approvalStatus: "PENDING_APPROVAL" },
  { value: "approved", label: "Approved", approvalStatus: "APPROVED" },
  { value: "rejected", label: "Rejected", approvalStatus: "REJECTED" },
];

function ApprovalStatusBadge({ status }: { status: SchemeApprovalStatus }) {
  const styles: Record<SchemeApprovalStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    PENDING_APPROVAL: "bg-amber-50 text-amber-800 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
        styles[status],
      )}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
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

export default function SchemeMasterPage() {
  const router = useRouter();
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [activeTab, setActiveTab] = useState<SchemeListTab>("all");
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTarget, setStatusTarget] = useState<SchemeListRecord | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(() => {
    const base = mergeListRequestFilters(
      appliedFilters,
      MASTER_FILTER_FIELD_MAPS.scheme,
    );
    const tab = SCHEME_LIST_TABS.find((t) => t.value === activeTab);
    if (tab?.approvalStatus) {
      return { ...base, approval_status: tab.approvalStatus };
    }
    return base;
  }, [appliedFilters, activeTab]);
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

  const listQuery = useSchemes(listParams);
  const toggleStatusMutation = useToggleSchemeStatus();
  const exportMutation = useExportSchemes();

  const countBase = useMemo(
    () => ({
      page: 1,
      pageSize: 1,
      search: appliedSearch,
      status: listStatus as "all" | "active" | "inactive",
      ordering: "",
    }),
    [appliedSearch, listStatus],
  );

  const allCountQuery = useSchemes({
    ...countBase,
    apiFilters: mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.scheme),
  });
  const draftCountQuery = useSchemes({
    ...countBase,
    apiFilters: {
      ...mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.scheme),
      approval_status: "DRAFT",
    },
  });
  const pendingCountQuery = useSchemes({
    ...countBase,
    apiFilters: {
      ...mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.scheme),
      approval_status: "PENDING_APPROVAL",
    },
  });
  const approvedCountQuery = useSchemes({
    ...countBase,
    apiFilters: {
      ...mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.scheme),
      approval_status: "APPROVED",
    },
  });
  const rejectedCountQuery = useSchemes({
    ...countBase,
    apiFilters: {
      ...mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.scheme),
      approval_status: "REJECTED",
    },
  });

  const tabCounts: Record<SchemeListTab, number> = {
    all: allCountQuery.data?.total ?? 0,
    draft: draftCountQuery.data?.total ?? 0,
    pending_approval: pendingCountQuery.data?.total ?? 0,
    approved: approvedCountQuery.data?.total ?? 0,
    rejected: rejectedCountQuery.data?.total ?? 0,
  };

  const schemeCodeOptionsQuery = useSchemeFilterDropdown("scheme_code", {
    enabled: isFilterOpen("schemeCode"),
  });
  const schemeNameOptionsQuery = useSchemeFilterDropdown("scheme_name", {
    enabled: isFilterOpen("schemeName"),
  });
  const statusOptionsQuery = useSchemeFilterDropdown("is_active", {
    enabled: isFilterOpen("status"),
  });

  const schemeCodeOptions = useMemo(
    () => schemeCodeOptionsQuery.data ?? [],
    [schemeCodeOptionsQuery.data],
  );
  const schemeNameOptions = useMemo(
    () => schemeNameOptionsQuery.data ?? [],
    [schemeNameOptionsQuery.data],
  );
  const schemeTypeOptions = useMemo(
    () => [
      { label: "Product Discount", value: "PRODUCT_DISCOUNT" },
      { label: "Near Expiry", value: "NEAR_EXPIRY" },
      { label: "Cash Discount", value: "CASH_DISCOUNT" },
      { label: "Turnover Discount", value: "TURNOVER_DISCOUNT" },
      { label: "Special Discount", value: "SPECIAL_SCHEME" },
    ],
    [],
  );
  const settlementOptions = useMemo(
    () => [
      { label: "Invoice Discount", value: "INVOICE_DISCOUNT" },
      { label: "Credit Note", value: "CREDIT_NOTE" },
    ],
    [],
  );
  const approvalOptions = useMemo(
    () =>
      (Object.keys(APPROVAL_STATUS_LABELS) as SchemeApprovalStatus[]).map(
        (value) => ({ label: APPROVAL_STATUS_LABELS[value], value }),
      ),
    [],
  );
  const statusOptions = useMemo(() => {
    if (statusOptionsQuery.data?.length) return statusOptionsQuery.data;
    return [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];
  }, [statusOptionsQuery.data]);

  const rows = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [appliedFilters, appliedSearch, sort, pageSize, activeTab]);

  const requestToggle = useCallback((row: SchemeListRecord) => {
    setStatusTarget(row);
  }, []);

  const confirmToggle = () => {
    if (!statusTarget) return;
    const nextActive = !isActiveStatus(statusTarget.status);
    toggleStatusMutation.mutate(
      { id: statusTarget.id, isActive: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: nextActive ? "Scheme activated" : "Scheme deactivated",
            type: "success",
          });
          setStatusTarget(null);
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update scheme status"),
            type: "error",
          });
        },
      },
    );
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
          setToast({ msg: "Schemes exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export schemes"),
            type: "error",
          });
        },
      },
    );
  };

  const columns: ColumnConfig<SchemeListRecord>[] = useMemo(
    () => [
      {
        key: "schemeCode",
        header: "Scheme Code",
        sortable: true,
        filterable: true,
        filterType: "text",
        filterOptions: schemeCodeOptions,
        width: "100px",
        render: (_v, row) => (
          <span className="text-[11px] font-mono font-medium text-foreground">
            {row.schemeCode}
          </span>
        ),
      },
      {
        key: "schemeName",
        header: "Scheme Name",
        sortable: true,
        filterable: true,
        filterType: "text",
        filterOptions: schemeNameOptions,
        width: "170px",
        truncate: false,
        render: (_v, row) => (
          <ListingTruncateCell text={row.schemeName} multiline>
            <span className="text-[11px] font-medium line-clamp-2">{row.schemeName}</span>
          </ListingTruncateCell>
        ),
      },
      {
        key: "schemeType",
        header: "Scheme Type",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: schemeTypeOptions,
        width: "130px",
        render: (_v, row) => (
          <span className="text-[11px]">{row.schemeTypeLabel}</span>
        ),
      },
      {
        key: "settlementType",
        header: "Settlement",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: settlementOptions,
        width: "110px",
        render: (_v, row) => (
          <span className="text-[11px]">{row.settlementTypeLabel}</span>
        ),
      },
      {
        key: "approvalStatus",
        header: "Approval",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: approvalOptions,
        width: "120px",
        truncate: false,
        render: (_v, row) => (
          <ApprovalStatusBadge status={row.approvalStatus} />
        ),
      },
      {
        key: "validity",
        header: "Validity",
        width: "150px",
        render: (_v, row) => (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {row.validityLabel}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "90px",
        truncate: false,
        render: (_v, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => requestToggle(row)}
            disabled={toggleStatusMutation.isPending}
          />
        ),
      },
      {
        key: "createdBy",
        header: "Created",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "140px",
        truncate: false,
        render: (_v, row) => (
          <ListingAuditCell
            name={row.createdBy}
            date={row.createdAt}
            variant="created"
          />
        ),
      },
      {
        key: "updatedBy",
        header: "Updated",
        sortable: true,
        filterable: true,
        filterType: "date",
        width: "140px",
        truncate: false,
        render: (_v, row) => (
          <ListingAuditCell
            name={row.updatedBy}
            date={row.updatedAt}
            variant="updated"
          />
        ),
      },
    ],
    [
      schemeCodeOptions,
      schemeNameOptions,
      schemeTypeOptions,
      settlementOptions,
      approvalOptions,
      statusOptions,
      requestToggle,
      toggleStatusMutation.isPending,
    ],
  );

  const actions: ActionItemConfig<SchemeListRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/masters/scheme/${row.id}`),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => router.push(`/masters/scheme/${row.id}/edit`),
    },
  ];

  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, { resource: "schemes" })
    : null;

  return (
    <ListingContainer
      title="Scheme Management"
      titleIcon={Gift}
      tabs={SCHEME_LIST_TABS.map((t) => ({
        value: t.value,
        label: `${t.label} (${tabCounts[t.value] ?? 0})`,
      }))}
      activeTab={activeTab}
      onTabChange={(value) => setActiveTab(value as SchemeListTab)}
    >
      {listError ? (
        <p className="text-xs text-red-600 mb-2 px-1">{listError}</p>
      ) : null}
      <MasterListing<SchemeListRecord>
        columns={columns}
        data={rows}
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
        onOpenFilter={handleOpenFilter}
        actions={actions}
        onAdd={() => router.push("/masters/scheme/add")}
        addLabel="Create Scheme"
        onExport={handleExport}
        emptyMessage="schemes"
        searchPlaceholder="Search code, name, description..."
        currentFilters={filters}
        currentSort={sort}
        loading={listQuery.isLoading || listQuery.isFetching}
      />

      <Dialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusTarget && isActiveStatus(statusTarget.status)
                ? "Deactivate scheme?"
                : "Activate scheme?"}
            </DialogTitle>
            <DialogDescription>
              {statusTarget
                ? `${statusTarget.schemeCode} — ${statusTarget.schemeName}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusTarget(null)}
              disabled={toggleStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmToggle}
              disabled={toggleStatusMutation.isPending}
            >
              {toggleStatusMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
