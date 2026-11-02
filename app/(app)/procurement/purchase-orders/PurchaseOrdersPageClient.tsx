"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Edit2,
  ShoppingCart,
  Scissors,
  MessageSquare,
  FileText,
  Mail,
} from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { Toast } from "../components/ProcurementUI";
// Listing-only phase: approval / action modals stay for future integration.
// import { ProcurementApprovalModal } from "../components/ProcurementApprovalModal";
import { ProcAvatar, HighlightText } from "../design/proc-design";
import { FollowUpListingCell } from "./components/VendorFollowUpPanel";
import { InvoiceListingCell } from "./components/POVendorInvoiceSection";
import { ThreeWayMatchListingCell } from "./components/ThreeWayMatchListingCell";
import { SendPOEmailModal } from "./components/SendPOEmailModal";
import { ShortClosePOModal } from "./components/ShortClosePOModal";
import { shortCloseReasonLabel } from "./po-qty";
import { useFlashToast } from "../hooks/useFlashToast";
import { formatListingDate } from "../components/listing/ListingCells";
import {
  getPOStatusLabel,
  PO_DRAFT_STATUS_FILTER_OPTIONS,
  PO_MAIN_STATUS_FILTER_OPTIONS,
  type POListStatus,
} from "@/lib/procurement/po-status";
import type { PurchaseOrderListItem } from "@/services/purchase-order-list.service";
import {
  buildPurchaseOrderApiFilters,
  buildPurchaseOrderOrdering,
} from "@/services/purchase-order-list.service";
import {
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  useCreatePOFollowup,
  useExportPurchaseOrders,
  usePurchaseOrder,
  usePurchaseOrderFilterDropdown,
  usePurchaseOrderList,
  usePurchaseOrderSummary,
  useShortClosePurchaseOrder,
} from "@/hooks/procurement";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { PurchaseOrderListKeyParams } from "@/lib/procurement/purchase-order-query-keys";
import type { POListingKpis } from "@/lib/procurement/listing-kpis";
import { POListingKpiRow } from "../components/listing/ListingKpiRows";
import { PurchaseReturnListing } from "./components/PurchaseReturnListing";
import { AddFollowUpModal } from "./components/AddFollowUpModal";
import {
  POActionConfirmModal,
  type POActionConfirmType,
} from "./components/POActionConfirmModal";
import {
  mapFollowupsFromDetail,
  PurchaseOrderService,
} from "@/services/purchase-order.service";
import type { POFollowUpEntry } from "./po-followup-data";
import type { PurchaseOrder } from "./po-data";
import {
  canCancelPOStatus,
  canClosePOStatus,
  canCreatePurchaseReturnPO,
  canShortClosePOStatus,
} from "./po-actions";
import { EMPTY_PO_BILLING } from "./po-address-utils";
import { purchaseReturnRoutes } from "../purchase-returns/purchase-return-utils";
import {
  usePoListingState,
  type PoListTabId,
  type PoListingState,
  type PoModuleTabId,
} from "./po-listing-state-context";

type TabId = PoModuleTabId;
// Approval / Rejected tabs — temporarily hidden
// | "pending_approval" | "rejected"

const TABS: { value: TabId; label: string }[] = [
  { value: "all", label: "PO" },
  { value: "draft", label: "Draft" },
  // { value: "pending_approval", label: "Approval" },
  // { value: "rejected", label: "Rejected" },
  { value: "po_return", label: "Purchase Return" },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Draft" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Pending Approval" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Rejected" },
  partially_received: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500", label: "Partially Received" },
  received: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Received" },
  invoice_uploaded: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Invoice Uploaded" },
  short_closed: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", label: "Short Closed" },
  closed: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Closed" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Cancelled" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    label: getPOStatusLabel(status),
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap",
      cfg.bg, cfg.text,
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function PurchaseOrdersPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    activeTab: tab,
    setActiveTab: setTab,
    poListingByTab,
    setPoListingByTab,
    returnListing,
    setReturnListing,
  } = usePoListingState();

  React.useEffect(() => {
    const t = searchParams.get("tab");
    if (t && ["all", "draft", "po_return"].includes(t)) {
      setTab(t as TabId);
    }
    // No ?tab= (e.g. back from PO view): keep module-scoped activeTab as-is.
  }, [searchParams, setTab]);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [modalPoId, setModalPoId] = useState<string | null>(null);
  const [modalListItem, setModalListItem] = useState<PurchaseOrderListItem | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [actionConfirmType, setActionConfirmType] = useState<POActionConfirmType>("close");
  const [shortCloseOpen, setShortCloseOpen] = useState(false);
  const [shortClosePo, setShortClosePo] = useState<PurchaseOrder | null>(null);
  const [shortCloseLoadingId, setShortCloseLoadingId] = useState<string | null>(null);
  const [modalFollowups, setModalFollowups] = useState<POFollowUpEntry[]>([]);
  const [downloadingPoId, setDownloadingPoId] = useState<string | null>(null);
  const [sendEmailPoId, setSendEmailPoId] = useState<string | null>(null);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);

  const lastPoTabKeyRef = useRef<PoListTabId>("all");

  const isPoTab = tab === "all" || tab === "draft";
  const isDraftTab = tab === "draft";
  if (isPoTab) {
    lastPoTabKeyRef.current = tab;
  }
  const poTabKey: PoListTabId = isPoTab ? tab : lastPoTabKeyRef.current;
  const { filters, sort, page, pageSize } = poListingByTab[poTabKey];

  const updatePoListing = (
    key: PoListTabId,
    updater: (prev: PoListingState) => PoListingState,
  ) => {
    setPoListingByTab((prev) => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  };

  const setFilters = (next: FilterState) => {
    updatePoListing(poTabKey, (prev) => ({ ...prev, filters: next, page: 1 }));
  };
  const setSort = (next: SortState) => {
    updatePoListing(poTabKey, (prev) => ({ ...prev, sort: next, page: 1 }));
  };
  const setPage = (next: number) => {
    updatePoListing(poTabKey, (prev) => ({ ...prev, page: next }));
  };
  const setPageSize = (next: number) => {
    updatePoListing(poTabKey, (prev) => ({ ...prev, pageSize: next, page: 1 }));
  };

  // Separate debounce state per PO tab so switching tabs does not briefly apply the previous tab's filters.
  const allDebounced = useDebouncedFilters(poListingByTab.all.filters);
  const draftDebounced = useDebouncedFilters(poListingByTab.draft.filters);
  const { debouncedFilters, debouncedSearch, isDebouncing } =
    poTabKey === "draft" ? draftDebounced : allDebounced;
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();

  useFlashToast(setToast);

  const apiFilters = useMemo(
    () => buildPurchaseOrderApiFilters(debouncedFilters, poTabKey),
    [debouncedFilters, poTabKey],
  );

  const ordering = useMemo(
    () => buildPurchaseOrderOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );

  const listParams = useMemo<PurchaseOrderListKeyParams>(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      ordering,
      apiFilters,
    }),
    [page, pageSize, debouncedSearch, ordering, apiFilters],
  );
  const filterScope = {
    excludeDraft: isPoTab && !isDraftTab,
    poStatus: isDraftTab ? "Draft" : undefined,
  };
  const listQuery = usePurchaseOrderList(listParams, isPoTab);
  const summaryQuery = usePurchaseOrderSummary();
  const poNoOptionsQuery = usePurchaseOrderFilterDropdown("po_no", {
    enabled: isPoTab && isFilterOpen("poNumber"),
    ...filterScope,
  });
  const supplierOptionsQuery = usePurchaseOrderFilterDropdown("supplier__supplier_name", {
    enabled: isPoTab && isFilterOpen("supplierName"),
    ...filterScope,
  });
  const statusOptionsQuery = usePurchaseOrderFilterDropdown("po_status", {
    enabled: isPoTab && isFilterOpen("status"),
    ...filterScope,
  });
  const exportMutation = useExportPurchaseOrders();
  const modalPoQuery = usePurchaseOrder(modalPoId);
  const followupMutation = useCreatePOFollowup();
  const closeMutation = useClosePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const shortCloseMutation = useShortClosePurchaseOrder();
  const actionSubmitting = closeMutation.isPending || cancelMutation.isPending;

  /** Prefer full detail; fall back to list-row stub so the popup opens immediately. */
  const modalPo = useMemo(() => {
    if (modalPoQuery.data) return modalPoQuery.data;
    if (!modalListItem) return null;
    return {
      id: modalListItem.id,
      poNumber: modalListItem.poNumber,
      poDate: modalListItem.poDate,
      supplierId: modalListItem.supplierId,
      supplierName: modalListItem.supplierName,
      supplierType: "",
      supplierGstin: modalListItem.supplierGstin,
      referenceNumber: "",
      currency: "INR",
      paymentType: modalListItem.paymentType,
      creditDays: 0,
      advancePercentage: 0,
      deliveryTerms: "",
      expectedDeliveryDate: "",
      state: "",
      warehouseId: null,
      warehouseName: modalListItem.warehouseName,
      deliveryAddress: "",
      notes: "",
      sourcePrId: modalListItem.sourcePrId || null,
      sourcePrNumber: modalListItem.sourcePrNumber,
      billing: { ...EMPTY_PO_BILLING },
      shipping: {
        shipToLocation: "",
        branch: "",
        address: "",
        contactPerson: "",
        contactNumber: "",
        sameAsBilling: false,
      },
      lines: [],
      terms: [],
      attachments: [],
      additionalCharges: [],
      otherCharges: 0,
      summary: {
        grossAmount: modalListItem.grandTotal,
        totalDiscount: 0,
        productTotal: modalListItem.grandTotal,
        additionalChargesTotal: 0,
        taxableValue: modalListItem.grandTotal,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        otherCharges: 0,
        grandTotal: modalListItem.grandTotal,
        amountInWords: "",
      },
      status: modalListItem.status,
      createdBy: modalListItem.createdBy,
      createdDate: modalListItem.createdAt,
      updatedBy: modalListItem.updatedBy,
      updatedDate: modalListItem.updatedAt,
      approvedBy: "",
      approvedDate: "",
      activity: [],
    } satisfies PurchaseOrder;
  }, [modalPoQuery.data, modalListItem]);

  const closeModals = () => {
    setFollowUpOpen(false);
    setActionConfirmOpen(false);
    setShortCloseOpen(false);
    setShortClosePo(null);
    setModalPoId(null);
    setModalListItem(null);
    setModalFollowups([]);
  };

  const openFollowUpModal = (row: PurchaseOrderListItem) => {
    setModalPoId(row.id);
    setModalListItem(row);
    setActionConfirmOpen(false);
    setShortCloseOpen(false);
    setShortClosePo(null);
    setFollowUpOpen(true);
  };

  const openActionConfirm = (row: PurchaseOrderListItem, action: POActionConfirmType) => {
    setModalPoId(row.id);
    setModalListItem(row);
    setFollowUpOpen(false);
    setShortCloseOpen(false);
    setShortClosePo(null);
    setActionConfirmType(action);
    setActionConfirmOpen(true);
  };

  const openShortCloseModal = async (row: PurchaseOrderListItem) => {
    setShortCloseLoadingId(row.id);
    setFollowUpOpen(false);
    setActionConfirmOpen(false);
    try {
      // Load full PO detail for the modal (list rows omit line items).
      const detail = await PurchaseOrderService.getById(row.id);
      setShortClosePo(detail);
      setShortCloseOpen(true);
    } catch (error) {
      setToast({
        msg: getErrorMessage(error, "Failed to open Short Close."),
        type: "error",
      });
    } finally {
      setShortCloseLoadingId(null);
    }
  };

  const handleActionConfirm = () => {
    if (!modalPoId) return;
    const mutation = actionConfirmType === "close" ? closeMutation : cancelMutation;
    mutation.mutate(modalPoId, {
      onSuccess: () => {
        closeModals();
        setToast({
          msg: actionConfirmType === "close" ? "PO closed." : "PO cancelled.",
          type: "success",
        });
        void listQuery.refetch();
        void summaryQuery.refetch();
      },
      onError: (error) => {
        setToast({
          msg: getErrorMessage(
            error,
            actionConfirmType === "close"
              ? "Failed to close purchase order."
              : "Failed to cancel purchase order.",
          ),
          type: "error",
        });
      },
    });
  };

  useEffect(() => {
    if (!modalPoId || !followUpOpen) return;
    let cancelled = false;
    PurchaseOrderService.getRawById(modalPoId)
      .then((raw) => {
        if (cancelled) return;
        setModalFollowups(mapFollowupsFromDetail(raw));
      })
      .catch(() => {
        if (cancelled) return;
        setModalFollowups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [modalPoId, followUpOpen, modalPoQuery.dataUpdatedAt]);

  const records = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching || isDebouncing;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, { resource: "purchase orders" })
    : null;

  const poNumbers = useMemo(
    () => poNoOptionsQuery.data ?? [],
    [poNoOptionsQuery.data],
  );
  const suppliers = useMemo(
    () => supplierOptionsQuery.data ?? [],
    [supplierOptionsQuery.data],
  );
  const statusFilterOptions = useMemo(() => {
    const fallback = isDraftTab
      ? PO_DRAFT_STATUS_FILTER_OPTIONS
      : PO_MAIN_STATUS_FILTER_OPTIONS;
    const fromApi = statusOptionsQuery.data ?? [];
    if (fromApi.length === 0) {
      return fallback.map((o) => ({ label: o.label, value: o.value }));
    }
    const filtered = isDraftTab
      ? fromApi.filter((o) => o.value === "draft")
      : fromApi.filter((o) => o.value !== "draft");
    return filtered.length > 0
      ? filtered
      : fallback.map((o) => ({ label: o.label, value: o.value }));
  }, [isDraftTab, statusOptionsQuery.data]);

  const summary = summaryQuery.data;

  const poListingKpis = useMemo<POListingKpis>(() => ({
    total: summary?.total ?? 0,
    openPo: summary?.openPo ?? 0,
    partialReceived: summary?.partialReceived ?? 0,
    fullyReceived: summary?.fullyReceived ?? 0,
    closedPo: summary?.closedPo ?? 0,
    totalPoValue: summary?.totalPoValue ?? 0,
  }), [summary]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: debouncedSearch,
        apiFilters,
        ordering,
      },
      {
        onSuccess: () => {
          setToast({ msg: "Purchase orders exported successfully.", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export purchase orders."),
            type: "error",
          });
        },
      },
    );
  };

  const handleDownloadPdf = async (row: PurchaseOrderListItem) => {
    try {
      setDownloadingPoId(row.id);
      await PurchaseOrderService.downloadPdfById(row.id);
      setToast({ msg: "PO PDF ready. Use browser save as PDF.", type: "success" });
    } catch (error) {
      setToast({
        msg: getErrorMessage(error, "Failed to generate PO PDF."),
        type: "error",
      });
    } finally {
      setDownloadingPoId(null);
    }
  };

  const columns: ColumnConfig<PurchaseOrderListItem>[] = [
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: poNumbers,
      render: (_val, row) => (
        <div>
          <button
            type="button"
            onClick={() => router.push(`/procurement/purchase-orders/${row.id}`)}
            className="text-left"
          >
            <p className="font-semibold text-brand-700 text-xs hover:underline">
              <HighlightText text={row.poNumber} query={(filters.search as string) || ""} />
            </p>
          </button>
          <p className="text-[11px] text-muted-foreground">{formatListingDate(row.poDate)}</p>
        </div>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: suppliers,
      render: (_val, row) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-2 text-xs text-foreground font-medium">
            <ProcAvatar name={row.supplierName} />
            <HighlightText text={row.supplierName} query={(filters.search as string) || ""} />
          </span>
          {row.supplierSecondaryLine ? (
            <p className="text-[11px] text-muted-foreground mt-0.5">{row.supplierSecondaryLine}</p>
          ) : null}
        </div>
      ),
    },
    // {
    //   key: "sourcePrNumber",
    //   header: "PR No.",
    //   sortable: true,
    //   filterable: true,
    //   filterType: "dropdown",
    //   filterOptions: prRefs,
    //   render: (_val, row) => (
    //     <span className="text-xs text-muted-foreground py-1">
    //       {row.sourcePrNumber ? (
    //         <HighlightText text={row.sourcePrNumber} query={(filters.search as string) || ""} />
    //       ) : (
    //         "—"
    //       )}
    //     </span>
    //   ),
    // },
    {
      key: "totalItems",
      header: "Items",
      sortable: true,
      render: (_val, row) => (
        <span className="text-xs tabular-nums text-foreground py-1">
          {row.totalItems}
        </span>
      ),
    },
    {
      key: "grandTotal",
      header: "PO Amount",
      sortable: true,
      render: (_val, row) => (
        <span className="text-xs font-semibold tabular-nums text-foreground py-1">
          {formatCurrency(row.grandTotal)}
        </span>
      ),
    },
    {
      key: "invoiceStatus",
      header: "Invoice",
      sortable: false,
      render: (_val, row) => (
        <InvoiceListingCell
          hasInvoice={row.invoiceCount > 0 || row.status === "invoice_uploaded"}
          invoiceCount={row.invoiceCount}
          onView={() => router.push(`/procurement/purchase-orders/${row.id}#vendor-invoice`)}
        />
      ),
    },
    {
      key: "threeWayMatchStatus",
      header: "3-Way Match",
      sortable: false,
      render: (_val, row) => (
        <ThreeWayMatchListingCell
          status={row.threeWayMatchStatus}
          onEdit={() => router.push(`/procurement/purchase-orders/${row.id}/edit`)}
        />
      ),
    },
    {
      key: "status",
      header: "PO Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: statusFilterOptions,
      render: (_val, row) => <StatusPill status={row.status} />,
    },
    {
      key: "followUp",
      header: "Follow-up",
      // sortable: true,
      render: (_val, row) => (
        <FollowUpListingCell
          followUpCount={row.followUpCount}
          onViewHistory={() => openFollowUpModal(row)}
        />
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
              onClick={() => router.push(`/procurement/purchase-orders/${row.id}`)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadPdf(row)}
              disabled={downloadingPoId === row.id}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" />
              {downloadingPoId === row.id ? "Generating PDF..." : "Download PDF"}
            </button>
            {!["draft", "cancelled"].includes(row.status) && (
              <button
                type="button"
                onClick={() => {
                  setSendEmailPoId(row.id);
                  setSendEmailOpen(true);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Mail className="w-3.5 h-3.5" /> Send Email
              </button>
            )}
            {(["draft", "rejected"] as POListStatus[]).includes(row.status) && (
              <button
                type="button"
                onClick={() => router.push(`/procurement/purchase-orders/${row.id}/edit`)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {/* Approve / Reject — temporarily hidden from listing actions
            {row.status === "pending_approval" && ( ... )}
            */}
            {!["draft", "cancelled"].includes(row.status) && (
              <button
                type="button"
                onClick={() => openFollowUpModal(row)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Add Follow-up
              </button>
            )}
            {canShortClosePOStatus(row.status) && (
              <button
                type="button"
                disabled={shortCloseLoadingId === row.id}
                onClick={() => void openShortCloseModal(row)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm",
                  shortCloseLoadingId === row.id && "text-muted-foreground/50 cursor-not-allowed",
                )}
              >
                <Scissors className="w-3.5 h-3.5" />
                {shortCloseLoadingId === row.id ? "Opening…" : "Short Close PO"}
              </button>
            )}
            {canClosePOStatus(row.status) && (
              <button
                type="button"
                onClick={() => openActionConfirm(row, "close")}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                Close PO
              </button>
            )}
            {canCreatePurchaseReturnPO(row) && (
              <button
                type="button"
                onClick={() => router.push(purchaseReturnRoutes.new(row.id, "po"))}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                Purchase Return
              </button>
            )}
            {canCancelPOStatus(row.status) && (
              <>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={() => openActionConfirm(row, "cancel")}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-sm"
                >
                  Cancel PO
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
      title="Purchase Order"
      titleIcon={ShoppingCart}
      tabs={TABS.map((t) => ({
        value: t.value,
        label: t.label,
      }))}
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id as TabId);
        router.replace(`/procurement/purchase-orders?tab=${id}`);
      }}
      metrics={tab === "po_return" ? undefined : <POListingKpiRow kpis={poListingKpis} />}
    >
      {tab === "po_return" ? (
        <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
          <PurchaseReturnListing
            filters={returnListing.filters}
            onFiltersChange={(next) =>
              setReturnListing((prev) => ({ ...prev, filters: next, page: 1 }))
            }
            sort={returnListing.sort}
            onSortChange={(next) =>
              setReturnListing((prev) => ({ ...prev, sort: next, page: 1 }))
            }
            page={returnListing.page}
            onPageChange={(next) =>
              setReturnListing((prev) => ({ ...prev, page: next }))
            }
            pageSize={returnListing.pageSize}
            onPageSizeChange={(next) =>
              setReturnListing((prev) => ({
                ...prev,
                pageSize: next,
                page: 1,
              }))
            }
          />
        </Suspense>
      ) : (
        <>
          {listError ? <p className="text-xs text-red-600 mb-2">{listError}</p> : null}
          <MasterListing<PurchaseOrderListItem>
            columns={columns}
            data={records}
            loading={loading}
            totalRecords={totalRecords}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            onFilterChange={setFilters}
            onOpenFilter={handleOpenFilter}
            onAdd={() => router.push("/procurement/purchase-orders/new")}
            addLabel="Create PO"
            emptyMessage="purchase orders"
            searchPlaceholder="Search PO no., PR no., supplier…"
            onExport={handleExport}
            currentFilters={filters}
            currentSort={sort}
          />
        </>
      )}

      {followUpOpen && modalPo && (
        <AddFollowUpModal
          open={followUpOpen}
          onOpenChange={(open) => {
            if (followupMutation.isPending) return;
            if (!open) closeModals();
          }}
          po={modalPo}
          entries={modalFollowups}
          submitting={followupMutation.isPending}
          onSubmit={(input) => {
            if (!modalPoId) return;
            followupMutation.mutate(
              {
                purchaseOrderId: modalPoId,
                followupDate: input.followUpAt,
                followupType: input.followUpType,
                nextFollowupDate: input.nextFollowUpAt,
                spokeWith: input.spokeWith,
                remarks: input.remarks,
              },
              {
                onSuccess: () => {
                  closeModals();
                  setToast({ msg: "Follow-up saved.", type: "success" });
                  void listQuery.refetch();
                  void summaryQuery.refetch();
                },
                onError: (error) => {
                  setToast({
                    msg: getErrorMessage(error, "Failed to save follow-up."),
                    type: "error",
                  });
                },
              },
            );
          }}
        />
      )}

      {actionConfirmOpen && modalPo && (
        <POActionConfirmModal
          open={actionConfirmOpen}
          onOpenChange={(open) => {
            if (!open) closeModals();
          }}
          po={modalPo}
          action={actionConfirmType}
          submitting={actionSubmitting}
          onConfirm={handleActionConfirm}
        />
      )}

      <ShortClosePOModal
        open={shortCloseOpen}
        onOpenChange={(open) => {
          if (shortCloseMutation.isPending) return;
          if (!open) closeModals();
          else setShortCloseOpen(true);
        }}
        po={shortClosePo}
        submitting={shortCloseMutation.isPending}
        onConfirm={(payload) => {
          if (!shortClosePo) return;
          shortCloseMutation.mutate(
            {
              purchaseOrderId: shortClosePo.id,
              shortCloseReason: shortCloseReasonLabel(payload.reason),
              shortCloseRemarks: payload.remarks,
              products: payload.products,
            },
            {
              onSuccess: () => {
                closeModals();
                setToast({ msg: "PO short closed.", type: "success" });
                void listQuery.refetch();
                void summaryQuery.refetch();
              },
              onError: (error) => {
                setToast({
                  msg: getErrorMessage(error, "Failed to short close PO."),
                  type: "error",
                });
              },
            },
          );
        }}
      />

      <SendPOEmailModal
        open={sendEmailOpen}
        purchaseOrderId={sendEmailPoId}
        onOpenChange={(open) => {
          setSendEmailOpen(open);
          if (!open) setSendEmailPoId(null);
        }}
        onSent={(result) => {
          setToast({
            msg: `PO email sent to ${result.to}.`,
            type: "success",
          });
        }}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
