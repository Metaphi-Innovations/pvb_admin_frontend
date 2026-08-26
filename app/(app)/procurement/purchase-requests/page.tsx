"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import {
  ColumnConfig,
  FilterState,
  SortState,
} from "@/components/listing/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Edit2,
  Send,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Toast } from "../components/ProcurementUI";
import { ProcurementApprovalModal } from "../components/ProcurementApprovalModal";
import { ProcAvatar, HighlightText } from "../design/proc-design";
import { useFlashToast } from "../hooks/useFlashToast";
import { formatListingDate } from "../components/listing/ListingCells";
import type { PRListingKpis } from "@/lib/procurement/listing-kpis";
import { PRListingKpiRow } from "../components/listing/ListingKpiRows";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import {
  buildPurchaseRequestApiFilters,
  buildPurchaseRequestOrdering,
  type PurchaseRequestListItem,
} from "@/services/purchase-request-list.service";
import {
  useApproveRejectPurchaseRequest,
  useDeletePurchaseRequest,
  useExportPurchaseRequests,
  usePurchaseRequestFilterDropdown,
  usePurchaseRequestList,
  usePurchaseRequestSummary,
  useUpdatePurchaseRequest,
} from "@/hooks/procurement";
import type { PurchaseRequestListKeyParams } from "@/lib/procurement/purchase-request-query-keys";
import {
  getPRPoStatusLabel,
  getPRStatusLabel,
  PR_LIST_TAB_STATUSES,
  type PRListStatus,
} from "@/lib/procurement/pr-status";
import { detailToFormValues } from "@/services/purchase-request.service";
import { PurchaseRequestService } from "@/services/purchase-request.service";

type TabId = "all" | PRListStatus;

const TABS: { value: TabId; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approval" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_CFG: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  draft: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    label: "Draft",
  },
  pending_approval: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Pending Approval",
  },
  approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Rejected",
  },
  not_created: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Not Created",
  },
  created: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Created",
  },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    label: status,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function PurchaseRequestsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("all");
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [approvalTarget, setApprovalTarget] =
    useState<PurchaseRequestListItem | null>(null);

  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({
    key: "prDate",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();

  useFlashToast(setToast);

  const apiFilters = useMemo(
    () => buildPurchaseRequestApiFilters(debouncedFilters, tab),
    [debouncedFilters, tab],
  );

  const ordering = useMemo(
    () => buildPurchaseRequestOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const listParams = useMemo<PurchaseRequestListKeyParams>(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      ordering,
      apiFilters,
    }),
    [page, pageSize, debouncedSearch, ordering, apiFilters],
  );

  const listQuery = usePurchaseRequestList(listParams);
  const summaryQuery = usePurchaseRequestSummary();
  const statusOptionsQuery = usePurchaseRequestFilterDropdown("status", {
    enabled: isFilterOpen("approvalStatus"),
  });
  const poStatusOptionsQuery = usePurchaseRequestFilterDropdown("po_status", {
    enabled: isFilterOpen("poStatus"),
  });
  const exportMutation = useExportPurchaseRequests();
  const approveRejectMutation = useApproveRejectPurchaseRequest();
  const updateMutation = useUpdatePurchaseRequest();
  const deleteMutation = useDeletePurchaseRequest();

  const records = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;
  const summary = summaryQuery.data;

  const prListingKpis = useMemo<PRListingKpis>(
    () => ({
      total: summary?.total ?? 0,
      pendingApproval: summary?.pendingApproval ?? 0,
      approved: summary?.approved ?? 0,
      rejected: summary?.rejected ?? 0,
      closed: 0,
    }),
    [summary],
  );

  const approvalStatusOptions = useMemo(() => {
    const fromApi = statusOptionsQuery.data ?? [];
    if (fromApi.length > 0) return fromApi;
    return PR_LIST_TAB_STATUSES.map((s) => ({
      label: getPRStatusLabel(s),
      value: s,
    }));
  }, [statusOptionsQuery.data]);

  const poStatusOptions = useMemo(() => {
    const fromApi = poStatusOptionsQuery.data ?? [];
    if (fromApi.length > 0) return fromApi;
    return [
      { label: getPRPoStatusLabel("not_created"), value: "not_created" },
      { label: getPRPoStatusLabel("created"), value: "created" },
    ];
  }, [poStatusOptionsQuery.data]);

  const requesters = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.requestedBy).filter(Boolean)),
      ).sort(),
    [records],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize, tab]);

  useEffect(() => {
    setFilters({});
    setSort({ key: "prDate", direction: "desc" });
    setPage(1);
  }, [tab]);

  useEffect(() => {
    setPage(1);
  }, [sort.key, sort.direction]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleApprovalConfirm = (remarks: string) => {
    if (!approvalTarget) return;
    approveRejectMutation.mutate(
      {
        id: approvalTarget.id,
        action: approvalAction,
        remarks: remarks || undefined,
      },
      {
        onSuccess: () => {
          setToast({
            msg:
              approvalAction === "approve" ? "PR approved." : "PR rejected.",
            type: "success",
          });
          setApprovalOpen(false);
          void summaryQuery.refetch();
        },
        onError: (err) => {
          setToast({
            msg: getErrorMessage(err, "Action failed."),
            type: "error",
          });
        },
      },
    );
  };

  const handleSubmitDraft = async (row: PurchaseRequestListItem) => {
    try {
      const detail = await PurchaseRequestService.getById(row.id);
      const form = detailToFormValues(detail);
      await updateMutation.mutateAsync({
        id: row.id,
        form,
        status: "pending_approval",
      });
      setToast({ msg: "PR submitted.", type: "success" });
      void summaryQuery.refetch();
    } catch (err) {
      setToast({
        msg: getErrorMessage(err, "Submit failed."),
        type: "error",
      });
    }
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: debouncedSearch,
        apiFilters,
        ordering,
      },
      {
        onError: (err) => {
          setToast({
            msg: getErrorMessage(err, "Export failed."),
            type: "error",
          });
        },
      },
    );
  };

  const columns: ColumnConfig<PurchaseRequestListItem>[] = [
    {
      key: "prNumber",
      header: "PR No.",
      sortable: true,
      render: (_val, row) => (
        <div>
          <p className="font-semibold text-brand-700 text-xs">
            <HighlightText
              text={row.prNumber}
              query={(filters.search as string) || ""}
            />
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatListingDate(row.prDate)}
          </p>
        </div>
      ),
    },
    {
      key: "requestedBy",
      header: "Requested By",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: requesters.map((r) => ({ label: r, value: r })),
      render: (_val, row) => (
        <span className="inline-flex items-center gap-2 text-xs text-foreground font-medium py-1">
          <ProcAvatar name={row.requestedBy || "—"} />
          <HighlightText
            text={row.requestedBy || "—"}
            query={(filters.search as string) || ""}
          />
        </span>
      ),
    },
    {
      key: "requiredByDate",
      header: "Required By",
      sortable: true,
      filterable: true,
      filterType: "date",
      render: (_val, row) => (
        <span className="text-xs text-muted-foreground tabular-nums py-1">
          {row.requiredByDate ? formatListingDate(row.requiredByDate) : "—"}
        </span>
      ),
    },
    {
      key: "totalItems",
      header: "Items",
      sortable: false,
      render: (_val, row) => (
        <span className="text-xs tabular-nums text-foreground py-1">
          {row.totalItems}
        </span>
      ),
    },
    // Hidden from listing — restore if required later
    // {
    //   key: "totalQty",
    //   header: "Total Base Qty",
    //   sortable: false,
    //   render: (_val, row) => (
    //     <span className="text-xs tabular-nums text-foreground py-1">
    //       {row.totalQty}
    //     </span>
    //   ),
    // },
    {
      key: "approvalStatus",
      header: "Approval Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: approvalStatusOptions,
      render: (_val, row) => <StatusPill status={row.status} />,
    },
    // Hidden from listing — restore if required later
    // {
    //   key: "currentApprover",
    //   header: "Current Approver",
    //   render: (_val, row) => (
    //     <span className="text-xs text-muted-foreground py-1">
    //       {row.status === "pending_approval" ? row.currentApprover || "—" : "—"}
    //     </span>
    //   ),
    // },
    {
      key: "poStatus",
      header: "PO Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: poStatusOptions,
      render: (_val, row) => <StatusPill status={row.poStatus} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (_val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-100">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-[200]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() =>
                router.push(`/procurement/purchase-requests/${row.id}`)
              }
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            {["draft", "rejected"].includes(row.status) && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/procurement/purchase-requests/${row.id}/edit`)
                }
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {row.status === "draft" && (
              <>
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => void handleSubmitDraft(row)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Submit
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (!window.confirm("Delete this draft PR?")) return;
                    deleteMutation.mutate(row.id, {
                      onSuccess: () => {
                        setToast({ msg: "PR deleted.", type: "success" });
                        void summaryQuery.refetch();
                      },
                      onError: (err) => {
                        setToast({
                          msg: getErrorMessage(err, "Delete failed."),
                          type: "error",
                        });
                      },
                    });
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-sm disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </>
            )}
            {row.status === "pending_approval" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setApprovalTarget(row);
                    setApprovalAction("approve");
                    setApprovalOpen(true);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApprovalTarget(row);
                    setApprovalAction("reject");
                    setApprovalOpen(true);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}
            {row.status === "approved" && row.poStatus !== "created" && (
              <>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/procurement/purchase-orders/new?prId=${row.id}`,
                    )
                  }
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Create PO
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <ListingContainer
      title="Purchase Request"
      titleIcon={ShoppingCart}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      metrics={<PRListingKpiRow kpis={prListingKpis} />}
    >
      <div>
        <MasterListing<PurchaseRequestListItem>
          columns={columns}
          data={records}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          onOpenFilter={handleOpenFilter}
          onAdd={() => router.push("/procurement/purchase-requests/new")}
          addLabel="Create PR"
          emptyMessage="purchase requests"
          searchPlaceholder="Search PR no., requester, remarks…"
          onExport={handleExport}
          loading={listQuery.isLoading || listQuery.isFetching}
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <ProcurementApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        documentNo={approvalTarget?.prNumber ?? ""}
        documentLabel="Purchase Request"
        action={approvalAction}
        onConfirm={handleApprovalConfirm}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
