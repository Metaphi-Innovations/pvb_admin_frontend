"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
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
  Send,
  CheckCircle2,
  XCircle,
  Upload,
  ShoppingCart,
  Scissors,
  MessageSquare,
} from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { Toast } from "../components/ProcurementUI";
import { ProcurementApprovalModal } from "../components/ProcurementApprovalModal";
import { ProcAvatar, HighlightText } from "../design/proc-design";
import { useFlashToast } from "../hooks/useFlashToast";
import { applySearch, sortRows, type SortDir } from "../hooks/useListingFilters";
import { formatListingDate } from "../components/listing/ListingCells";
import {
  type PurchaseOrder,
  loadPurchaseOrders,
  savePurchaseOrders,
  submitPO,
  approvePO,
  rejectPO,
  closePO,
  cancelPO,
} from "./po-data";
import { canShortClosePO } from "./po-qty";
import {
  getPOListingInvoiceStatus,
  getPOListingThreeWayMatchStatus,
  getPOTotalItems,
  getVendorSecondaryLine,
} from "./po-listing-utils";
import { ThreeWayMatchListingCell } from "./components/ThreeWayMatchSection";
import { getPOFollowUpSummary } from "./po-followup-data";
import { ShortClosePOModal } from "./components/ShortClosePOModal";
import { AddFollowUpModal } from "./components/AddFollowUpModal";
import { POActionConfirmModal, type POActionConfirmType } from "./components/POActionConfirmModal";
import { FollowUpListingCell } from "./components/VendorFollowUpPanel";
import { InvoiceListingCell } from "./components/POVendorInvoiceSection";
import { UploadVendorInvoiceDialog } from "./components/UploadVendorInvoiceDialog";
import { addPOFollowUp, canAddPOFollowUp } from "./po-followup-data";
import { canUploadPOInvoice } from "./po-invoice-utils";
import { exportPOListingCsv } from "./po-export-utils";
import { computePOListingKpis } from "@/lib/procurement/listing-kpis";
import { POListingKpiRow } from "../components/listing/ListingKpiRows";
import { CreatePurchaseReturnAction } from "../purchase-returns/components/CreatePurchaseReturnAction";
import { loadPurchaseReturns } from "../purchase-returns/purchase-return-data";
import { purchaseReturnRoutes } from "../purchase-returns/purchase-return-utils";
import { PurchaseReturnListing } from "./components/PurchaseReturnListing";

type TabId = "all" | "draft" | "pending_approval" | "rejected" | "po_return";

const TABS: { value: TabId; label: string }[] = [
  { value: "all", label: "PO" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Approval" },
  { value: "rejected", label: "Rejected" },
  { value: "po_return", label: "Purchase Return" },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Draft" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Pending Approval" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Rejected" },
  invoice_uploaded: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Invoice Uploaded" },
  short_closed: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", label: "Short Closed" },
  closed: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Closed" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Cancelled" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: status };
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
  const [records, setRecords] = useState<PurchaseOrder[]>(() => loadPurchaseOrders());
  const [tab, setTab] = useState<TabId>("all");

  React.useEffect(() => {
    const t = searchParams.get("tab");
    if (t && ["all", "draft", "pending_approval", "rejected", "po_return"].includes(t)) {
      setTab(t as TabId);
    }
  }, [searchParams]);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<PurchaseOrder | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [shortCloseOpen, setShortCloseOpen] = useState(false);
  const [shortCloseTarget, setShortCloseTarget] = useState<PurchaseOrder | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<PurchaseOrder | null>(null);
  const [followUpRev, setFollowUpRev] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<PurchaseOrder | null>(null);
  const [uploadReplace, setUploadReplace] = useState(false);
  const [invoiceRev, setInvoiceRev] = useState(0);
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);
  const [actionConfirmType, setActionConfirmType] = useState<POActionConfirmType>("close");
  const [actionConfirmTarget, setActionConfirmTarget] = useState<PurchaseOrder | null>(null);

  // MasterListing States
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "poDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useFlashToast(setToast);

  const refresh = () => setRecords(loadPurchaseOrders());

  const suppliers = useMemo(
    () => Array.from(new Set(records.map((r) => r.supplierName))).filter(Boolean).sort(),
    [records],
  );
  const prRefs = useMemo(
    () => Array.from(new Set(records.map((r) => r.sourcePrNumber).filter(Boolean))).sort(),
    [records],
  );

  const tabCounts = useMemo(() => {
    const c: Partial<Record<TabId, number>> = { all: records.length };
    (["draft", "pending_approval", "rejected"] as TabId[]).forEach((s) => {
      if (s !== "all") c[s] = records.filter((r) => r.status === s).length;
    });
    c["po_return"] = loadPurchaseReturns().length;
    return c;
  }, [records]);

  const filtered = useMemo(() => {
    let r = [...records];
    if (tab !== "all" && tab !== "po_return") r = r.filter((x) => x.status === tab);

    // MasterListing Filters
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;
      if (key === "search") {
        r = applySearch(r, val as string, (x) => [x.poNumber, x.sourcePrNumber, x.supplierName]);
      } else if (key === "supplierName") {
        const selected = val as string[];
        if (selected.length) r = r.filter((x) => selected.includes(x.supplierName));
      } else if (key === "sourcePrNumber") {
        const selected = val as string[];
        if (selected.length) r = r.filter((x) => selected.includes(x.sourcePrNumber));
      } else if (key === "status") {
        const selected = val as string[];
        if (selected.length) r = r.filter((x) => selected.includes(x.status));
      } else if (key === "poDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) r = r.filter((x) => x.poDate >= range.fromDate);
        if (range.toDate) r = r.filter((x) => x.poDate <= range.toDate);
      }
    });

    // Sorting
    if (sort.key && sort.direction !== "none") {
      r = sortRows(r, sort.key, sort.direction as SortDir, {
        poNumber: (x) => x.poNumber,
        supplierName: (x) => x.supplierName,
        sourcePrNumber: (x) => x.sourcePrNumber,
        totalItems: (x) => getPOTotalItems(x),
        grandTotal: (x) => x.summary.grandTotal,
        invoiceStatus: (x) => getPOListingInvoiceStatus(x),
        threeWayMatch: (x) => getPOListingThreeWayMatchStatus(x),
        status: (x) => x.status,
        followUp: (x) => getPOFollowUpSummary(x.id).availability,
      });
    }

    return r;
  }, [records, tab, filters, sort, followUpRev, invoiceRev]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const updateOne = (updated: PurchaseOrder) => {
    savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === updated.id ? updated : p)));
    refresh();
  };

  const poListingKpis = useMemo(() => computePOListingKpis(records), [records, followUpRev, invoiceRev]);

  const openUpload = (po: PurchaseOrder, replace = false) => {
    setUploadTarget(po);
    setUploadReplace(replace);
    setUploadOpen(true);
  };

  const handleInvoiceSaved = () => {
    refresh();
    setInvoiceRev((r) => r + 1);
    setUploadTarget(null);
    setToast({ msg: "Supplier invoice saved.", type: "success" });
  };

  const columns: ColumnConfig<PurchaseOrder>[] = [
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      render: (val, row) => (
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
      filterOptions: suppliers.map(s => ({ label: s, value: s })),
      render: (val, row) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-2 text-xs text-foreground font-medium">
            <ProcAvatar name={row.supplierName} />
            <HighlightText text={row.supplierName} query={(filters.search as string) || ""} />
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{getVendorSecondaryLine(row)}</p>
        </div>
      ),
    },
    {
      key: "sourcePrNumber",
      header: "PR No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: prRefs.map(p => ({ label: p, value: p })),
      render: (val, row) => (
        <span className="text-xs text-muted-foreground py-1">
          {row.sourcePrNumber ? <HighlightText text={row.sourcePrNumber} query={(filters.search as string) || ""} /> : "—"}
        </span>
      ),
    },
    {
      key: "totalItems",
      header: "Items",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs tabular-nums text-foreground py-1">
          {getPOTotalItems(row)}
        </span>
      ),
    },
    {
      key: "grandTotal",
      header: "PO Amount",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs font-semibold tabular-nums text-foreground py-1">
          {formatCurrency(row.summary.grandTotal)}
        </span>
      ),
    },
    {
      key: "invoiceStatus",
      header: "Invoice",
      sortable: true,
      render: (val, row) => (
        <InvoiceListingCell
          po={row}
          onView={() => router.push(`/procurement/purchase-orders/${row.id}#vendor-invoice`)}
          onUpload={() => openUpload(row)}
        />
      ),
    },
    {
      key: "threeWayMatch",
      header: "3-Way Match",
      sortable: true,
      render: (val, row) => (
        <ThreeWayMatchListingCell
          po={row}
          onView={() => router.push(`/procurement/purchase-orders/${row.id}#three-way-match`)}
        />
      ),
    },
    {
      key: "status",
      header: "PO Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Draft", value: "draft" },
        { label: "Pending Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Invoice Uploaded", value: "invoice_uploaded" },
        { label: "Short Closed", value: "short_closed" },
        { label: "Closed", value: "closed" },
        { label: "Cancelled", value: "cancelled" },
      ],
      render: (val, row) => <StatusPill status={row.status} />,
    },
    {
      key: "followUp",
      header: "Follow-up",
      sortable: true,
      render: (val, row) => (
        <FollowUpListingCell
          poId={row.id}
          onViewHistory={() => router.push(`/procurement/purchase-orders/${row.id}#follow-up-history`)}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (val, row) => (
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
            {["draft", "rejected"].includes(row.status) && (
              <button
                type="button"
                onClick={() => router.push(`/procurement/purchase-orders/${row.id}/edit`)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {row.status === "draft" && (
              <button
                type="button"
                onClick={() => { updateOne(submitPO(row)); setToast({ msg: "PO submitted.", type: "success" }); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Send className="w-3.5 h-3.5" /> Submit
              </button>
            )}
            {row.status === "pending_approval" && (
              <>
                <button
                  type="button"
                  onClick={() => { setApprovalTarget(row); setApprovalAction("approve"); setApprovalOpen(true); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => { setApprovalTarget(row); setApprovalAction("reject"); setApprovalOpen(true); }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}
            {canUploadPOInvoice(row) && (
              <button
                type="button"
                onClick={() => openUpload(row, row.status === "invoice_uploaded")}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Invoice
              </button>
            )}
            {canAddPOFollowUp(row) && (
              <button
                type="button"
                onClick={() => { setFollowUpTarget(row); setFollowUpOpen(true); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Add Follow-up
              </button>
            )}
            {canShortClosePO(row) && (
              <button
                type="button"
                onClick={() => { setShortCloseTarget(row); setShortCloseOpen(true); }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Scissors className="w-3.5 h-3.5" /> Short Close PO
              </button>
            )}
            <CreatePurchaseReturnAction
              po={row}
              onCreate={() => router.push(purchaseReturnRoutes.new(row.id))}
            />
            {["approved", "invoice_uploaded"].includes(row.status) && (
              <button
                type="button"
                onClick={() => {
                  setActionConfirmTarget(row);
                  setActionConfirmType("close");
                  setActionConfirmOpen(true);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                Close PO
              </button>
            )}
            {!["closed", "cancelled", "short_closed"].includes(row.status) && (
              <>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={() => {
                    setActionConfirmTarget(row);
                    setActionConfirmType("cancel");
                    setActionConfirmOpen(true);
                  }}
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
        <MasterListing<PurchaseOrder>
            columns={columns}
            data={paginated}
            totalRecords={filtered.length}
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
            onExport={() => exportPOListingCsv(filtered)}
            currentFilters={filters}
            currentSort={sort}
          />
      )}

      {uploadTarget && (
        <UploadVendorInvoiceDialog
          open={uploadOpen}
          onClose={() => {
            setUploadOpen(false);
            setUploadTarget(null);
          }}
          po={uploadTarget}
          replaceMode={uploadReplace}
          onSaved={() => {
            setUploadOpen(false);
            handleInvoiceSaved();
          }}
        />
      )}

      <AddFollowUpModal
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        po={followUpTarget}
        onSubmit={(input) => {
          if (!followUpTarget) return;
          const { updatedPo } = addPOFollowUp(followUpTarget, input);
          updateOne(updatedPo);
          setFollowUpTarget(updatedPo);
          setFollowUpRev((r) => r + 1);
          setToast({ msg: "Follow-up saved.", type: "success" });
        }}
      />

      <ShortClosePOModal
        open={shortCloseOpen}
        onOpenChange={setShortCloseOpen}
        po={shortCloseTarget}
        onConfirm={(updated) => {
          updateOne(updated);
          setShortCloseTarget(null);
          setToast({ msg: "PO short closed successfully.", type: "success" });
        }}
      />

      <ProcurementApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        documentNo={approvalTarget?.poNumber ?? ""}
        documentLabel="Purchase Order"
        action={approvalAction}
        onConfirm={(remarks) => {
          if (!approvalTarget) return;
          updateOne(approvalAction === "approve" ? approvePO(approvalTarget) : rejectPO(approvalTarget, remarks));
          setApprovalOpen(false);
          setToast({ msg: approvalAction === "approve" ? "PO approved." : "PO rejected.", type: "success" });
        }}
      />

      <POActionConfirmModal
        open={actionConfirmOpen}
        onOpenChange={(open) => {
          setActionConfirmOpen(open);
          if (!open) setActionConfirmTarget(null);
        }}
        po={actionConfirmTarget}
        action={actionConfirmType}
        onConfirm={() => {
          if (!actionConfirmTarget) return;
          const updated =
            actionConfirmType === "close"
              ? closePO(actionConfirmTarget)
              : cancelPO(actionConfirmTarget);
          updateOne(updated);
          setActionConfirmTarget(null);
          setToast({
            msg: actionConfirmType === "close" ? "PO closed." : "PO cancelled.",
            type: "success",
          });
        }}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
