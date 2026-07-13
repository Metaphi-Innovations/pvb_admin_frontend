"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
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
  Upload,
  ShoppingCart,
  Scissors,
  MessageSquare,
} from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { Toast } from "../components/ProcurementUI";
// Listing-only phase: approval / action modals stay for future integration.
// import { ProcurementApprovalModal } from "../components/ProcurementApprovalModal";
import { ProcAvatar, HighlightText } from "../design/proc-design";
import { FollowUpListingCell } from "./components/VendorFollowUpPanel";
import { InvoiceListingCell } from "./components/POVendorInvoiceSection";
import { useFlashToast } from "../hooks/useFlashToast";
import { formatListingDate } from "../components/listing/ListingCells";
import {
  getPOStatusLabel,
  PO_LIST_STATUS_FILTER_OPTIONS,
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
  useUploadPOInvoice,
} from "@/hooks/procurement";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { PurchaseOrderListKeyParams } from "@/lib/procurement/purchase-order-query-keys";
import type { PurchaseReturnListKeyParams } from "@/lib/procurement/purchase-return-query-keys";
import type { POListingKpis } from "@/lib/procurement/listing-kpis";
import { POListingKpiRow } from "../components/listing/ListingKpiRows";
import { PurchaseReturnListing } from "./components/PurchaseReturnListing";
import { UploadVendorInvoiceDialog } from "./components/UploadVendorInvoiceDialog";
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
import { canUploadPOInvoiceForStatus } from "./po-invoice-utils";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { usePurchaseReturnList } from "@/hooks/procurement";
import { purchaseReturnRoutes } from "../purchase-returns/purchase-return-utils";

type TabId = "all" | "draft" | "po_return";
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
  const [tab, setTab] = useState<TabId>("all");

  React.useEffect(() => {
    const t = searchParams.get("tab");
    if (t && ["all", "draft", "po_return"].includes(t)) {
      setTab(t as TabId);
    }
  }, [searchParams]);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [modalPoId, setModalPoId] = useState<string | null>(null);
  const [modalListItem, setModalListItem] = useState<PurchaseOrderListItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [actionConfirmType, setActionConfirmType] = useState<POActionConfirmType>("close");
  const [modalFollowups, setModalFollowups] = useState<POFollowUpEntry[]>([]);

  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useFlashToast(setToast);

  const apiFilters = useMemo(
    () => buildPurchaseOrderApiFilters(debouncedFilters, tab),
    [debouncedFilters, tab],
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

  const isPoTab = tab !== "po_return";
  const listQuery = usePurchaseOrderList(listParams, isPoTab);
  const summaryQuery = usePurchaseOrderSummary();
  const poNoOptionsQuery = usePurchaseOrderFilterDropdown("po_no");
  const supplierOptionsQuery = usePurchaseOrderFilterDropdown("supplier__supplier_name");
  const prOptionsQuery = usePurchaseOrderFilterDropdown("purchase_requisition__pr_number");
  const exportMutation = useExportPurchaseOrders();
  const modalPoQuery = usePurchaseOrder(modalPoId);
  const uploadMutation = useUploadPOInvoice();
  const followupMutation = useCreatePOFollowup();
  const closeMutation = useClosePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const actionSubmitting = closeMutation.isPending || cancelMutation.isPending;
  const prListParams = useMemo<PurchaseReturnListKeyParams>(
    () => ({ page: 1, pageSize: 1, search: "", ordering: undefined, apiFilters: {} }),
    [],
  );
  const purchaseReturnCountQuery = usePurchaseReturnList(prListParams);

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
      deliveryTerms: "",
      expectedDeliveryDate: "",
      state: "",
      warehouseId: null,
      warehouseName: modalListItem.warehouseName,
      deliveryAddress: "",
      notes: "",
      sourcePrId: modalListItem.sourcePrId || null,
      sourcePrNumber: modalListItem.sourcePrNumber,
      billing: { ...COMPANY_BILLING },
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
    setUploadOpen(false);
    setFollowUpOpen(false);
    setActionConfirmOpen(false);
    setModalPoId(null);
    setModalListItem(null);
    setModalFollowups([]);
  };

  const openUploadModal = (row: PurchaseOrderListItem) => {
    setModalPoId(row.id);
    setModalListItem(row);
    setFollowUpOpen(false);
    setActionConfirmOpen(false);
    setUploadOpen(true);
  };

  const openFollowUpModal = (row: PurchaseOrderListItem) => {
    setModalPoId(row.id);
    setModalListItem(row);
    setUploadOpen(false);
    setActionConfirmOpen(false);
    setFollowUpOpen(true);
  };

  const openActionConfirm = (row: PurchaseOrderListItem, action: POActionConfirmType) => {
    setModalPoId(row.id);
    setModalListItem(row);
    setUploadOpen(false);
    setFollowUpOpen(false);
    setActionConfirmType(action);
    setActionConfirmOpen(true);
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
  const prRefs = useMemo(
    () => prOptionsQuery.data ?? [],
    [prOptionsQuery.data],
  );

  const summary = summaryQuery.data;

  const tabCounts = useMemo(() => {
    const c: Partial<Record<TabId, number>> = {};
    if (summary) {
      c.all = summary.total;
      c.draft = summary.draftPo;
    }
    c.po_return = purchaseReturnCountQuery.data?.total ?? 0;
    return c;
  }, [purchaseReturnCountQuery.data?.total, summary]);

  /** Only map KPI fields that exist on the backend summary response. */
  const poListingKpis = useMemo<POListingKpis>(() => ({
    total: summary?.total ?? 0,
    openPo: 0,
    partialReceived: 0,
    fullyReceived: 0,
    closedPo: summary?.closedPo ?? 0,
    totalPoValue: 0,
  }), [summary]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize, tab]);

  useEffect(() => {
    setPage(1);
  }, [sort.key, sort.direction]);

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
          canUpload={canUploadPOInvoiceForStatus(row.status)}
          onView={() => router.push(`/procurement/purchase-orders/${row.id}#vendor-invoice`)}
          onUpload={() => openUploadModal(row)}
        />
      ),
    },
    // 3-Way Match module is not implemented yet — temporarily hidden.
    // {
    //   key: "threeWayMatch",
    //   header: "3-Way Match",
    //   sortable: true,
    //   render: (val, row) => (
    //     <ThreeWayMatchListingCell
    //       po={row}
    //       onView={() => router.push(`/procurement/purchase-orders/${row.id}#three-way-match`)}
    //     />
    //   ),
    // },
    {
      key: "status",
      header: "PO Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: PO_LIST_STATUS_FILTER_OPTIONS.map((o) => ({
        label: o.label,
        value: o.value,
      })),
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
            {(["approved", "invoice_uploaded", "partially_received", "received"] as POListStatus[]).includes(row.status) && (
              <button
                type="button"
                onClick={() => openUploadModal(row)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Invoice
              </button>
            )}
            {!["draft", "cancelled"].includes(row.status) && (
              <button
                type="button"
                onClick={() => openFollowUpModal(row)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Add Follow-up
              </button>
            )}
            {(["approved", "invoice_uploaded", "partially_received", "received"] as POListStatus[]).includes(row.status) && (
              <button
                type="button"
                onClick={() => router.push(`/procurement/purchase-orders/${row.id}?shortClose=1`)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Scissors className="w-3.5 h-3.5" /> Short Close PO
              </button>
            )}
            {(["approved", "invoice_uploaded", "partially_received", "received"] as POListStatus[]).includes(row.status) && (
              <button
                type="button"
                onClick={() => openActionConfirm(row, "close")}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                Close PO
              </button>
            )}
            {!["closed", "cancelled", "short_closed"].includes(row.status) && (
              <>
                <button
                  type="button"
                  onClick={() => router.push(purchaseReturnRoutes.new(row.id))}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                >
                  Purchase Return
                </button>
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
        label: `${t.label}${tabCounts[t.value] != null ? ` (${tabCounts[t.value]})` : ""}`,
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
          <PurchaseReturnListing />
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

      {uploadOpen && modalPo && (
        <UploadVendorInvoiceDialog
          open={uploadOpen}
          onClose={closeModals}
          po={modalPo}
          submitting={uploadMutation.isPending || modalPoQuery.isFetching}
          onSaved={(input) => {
            uploadMutation.mutate(
              {
                purchaseOrderId: modalPo.id,
                supplierInvoiceNo: input.supplierInvoiceNo,
                supplierInvoiceDate: input.supplierInvoiceDate,
                invoiceAmount: input.invoiceAmount,
                gstAmount: input.gstAmount,
                totalInvoiceAmount: input.totalInvoiceAmount,
                remarks: input.remarks,
                file: input.file,
              },
              {
                onSuccess: () => {
                  closeModals();
                  setToast({ msg: "Vendor invoice saved.", type: "success" });
                  void listQuery.refetch();
                  void summaryQuery.refetch();
                },
                onError: (error) => {
                  setToast({
                    msg: getErrorMessage(error, "Failed to upload invoice."),
                    type: "error",
                  });
                },
              },
            );
          }}
        />
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

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
