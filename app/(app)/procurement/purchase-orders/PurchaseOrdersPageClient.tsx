"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
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
import { ProcBadge, ProcAvatar, HighlightText } from "../design/proc-design";
import { useFlashToast } from "../hooks/useFlashToast";
import { applySearch, sortRows, type SortDir } from "../hooks/useListingFilters";
import { StackedCell, formatListingDate } from "../components/listing/ListingCells";
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
import { FollowUpListingCell } from "./components/VendorFollowUpPanel";
import { InvoiceListingCell } from "./components/POVendorInvoiceSection";
import { UploadVendorInvoiceDialog } from "./components/UploadVendorInvoiceDialog";
import { addPOFollowUp, canAddPOFollowUp } from "./po-followup-data";
import { canUploadPOInvoice } from "./po-invoice-utils";
import { exportPOListingCsv } from "./po-export-utils";
import { filterPOsForAnalytics } from "../analytics/proc-analytics-utils";
import { computePOAnalytics } from "../analytics/po-analytics";
import { POAnalyticsDashboard } from "../components/analytics/POAnalyticsDashboard";

type TabId = "all" | "draft" | "pending_approval" | "approved" | "rejected";

const TABS: { value: TabId; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function PurchaseOrdersPageClient() {
  const router = useRouter();
  const [records, setRecords] = useState<PurchaseOrder[]>(() => loadPurchaseOrders());
  const [tab, setTab] = useState<TabId>("all");
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
    (["draft", "pending_approval", "approved", "rejected"] as TabId[]).forEach((s) => {
      if (s !== "all") c[s] = records.filter((r) => r.status === s).length;
    });
    return c;
  }, [records]);

  const filtered = useMemo(() => {
    let r = [...records];
    if (tab !== "all") r = r.filter((x) => x.status === tab);

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

  const analyticsBase = useMemo(() => {
    const statusFilter = (filters.status as string[]) || [];
    const supplierFilter = (filters.supplierName as string[]) || [];
    const dateRange = (filters.poDate as { fromDate: string; toDate: string }) || {};
    return filterPOsForAnalytics(records, {
      status: statusFilter,
      supplier: supplierFilter,
      dateFrom: dateRange.fromDate || "",
      dateTo: dateRange.toDate || "",
      search: (filters.search as string) || "",
    });
  }, [records, filters]);

  const poAnalytics = useMemo(() => computePOAnalytics(analyticsBase), [analyticsBase, followUpRev]);

  const openUpload = (po: PurchaseOrder, replace = false) => {
    setUploadTarget(po);
    setUploadReplace(replace);
    setUploadOpen(true);
  };

  const handleInvoiceSaved = () => {
    refresh();
    setInvoiceRev((r) => r + 1);
    setUploadTarget(null);
    setToast({ msg: "Vendor invoice saved.", type: "success" });
  };

  const columns: ColumnConfig<PurchaseOrder>[] = [
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      render: (val, row) => (
        <StackedCell
          primary={<HighlightText text={row.poNumber} query={(filters.search as string) || ""} />}
          secondary={formatListingDate(row.poDate)}
        />
      ),
    },
    {
      key: "supplierName",
      header: "Vendor",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: suppliers.map(s => ({ label: s, value: s })),
      render: (val, row) => (
        <StackedCell
          primary={
            <span className="inline-flex items-center gap-2">
              <ProcAvatar name={row.supplierName} />
              <HighlightText text={row.supplierName} query={(filters.search as string) || ""} />
            </span>
          }
          secondary={getVendorSecondaryLine(row)}
        />
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
        <span className="text-[13px] text-[#6B80A0] py-2">
          {row.sourcePrNumber ? <HighlightText text={row.sourcePrNumber} query={(filters.search as string) || ""} /> : "—"}
        </span>
      ),
    },
    {
      key: "totalItems",
      header: "Items",
      sortable: true,
      render: (val, row) => (
        <span className="text-[13px] tabular-nums text-[#3D5473] py-2">
          {getPOTotalItems(row)}
        </span>
      ),
    },
    {
      key: "grandTotal",
      header: "PO Amount",
      sortable: true,
      render: (val, row) => (
        <span className="text-[13px] font-semibold tabular-nums text-[#0A1628] py-2">
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
      render: (val, row) => <ProcBadge status={row.status} />,
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
            <button className="p-1.5 rounded-md hover:bg-brand-50">
              <MoreHorizontal className="w-4 h-4 text-[#6B80A0]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-[400]">
            <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${row.id}`)}>
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            {["draft", "rejected"].includes(row.status) && (
              <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${row.id}/edit`)}>
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {row.status === "draft" && (
              <DropdownMenuItem onClick={() => { updateOne(submitPO(row)); setToast({ msg: "PO submitted.", type: "success" }); }}>
                <Send className="w-3.5 h-3.5 mr-2" /> Submit
              </DropdownMenuItem>
            )}
            {row.status === "pending_approval" && (
              <>
                <DropdownMenuItem onClick={() => { setApprovalTarget(row); setApprovalAction("approve"); setApprovalOpen(true); }}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setApprovalTarget(row); setApprovalAction("reject"); setApprovalOpen(true); }}>
                  <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                </DropdownMenuItem>
              </>
            )}
            {canUploadPOInvoice(row) && (
              <DropdownMenuItem onClick={() => openUpload(row, row.status === "invoice_uploaded")}>
                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Invoice
              </DropdownMenuItem>
            )}
            {canAddPOFollowUp(row) && (
              <DropdownMenuItem onClick={() => { setFollowUpTarget(row); setFollowUpOpen(true); }}>
                <MessageSquare className="w-3.5 h-3.5 mr-2" /> Add Follow-up
              </DropdownMenuItem>
            )}
            {canShortClosePO(row) && (
              <DropdownMenuItem onClick={() => { setShortCloseTarget(row); setShortCloseOpen(true); }}>
                <Scissors className="w-3.5 h-3.5 mr-2" /> Short Close PO
              </DropdownMenuItem>
            )}
            {["approved", "invoice_uploaded"].includes(row.status) && (
              <DropdownMenuItem onClick={() => { updateOne(closePO(row)); setToast({ msg: "PO closed.", type: "success" }); }}>
                Close PO
              </DropdownMenuItem>
            )}
            {!["closed", "cancelled", "short_closed"].includes(row.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={() => { updateOne(cancelPO(row)); setToast({ msg: "PO cancelled.", type: "success" }); }}>
                  Cancel PO
                </DropdownMenuItem>
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
      onTabChange={(id) => setTab(id as TabId)}
      metrics={<POAnalyticsDashboard analytics={poAnalytics} />}
    >
      <div>
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
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

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
          setFollowUpTarget(null);
          setFollowUpRev((r) => r + 1);
          setToast({ msg: "Follow-up added.", type: "success" });
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
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
