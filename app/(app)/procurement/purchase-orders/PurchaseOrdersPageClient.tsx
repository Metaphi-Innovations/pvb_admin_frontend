"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
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
  RotateCcw,
  Clock,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { FollowUpListingCell } from "./components/VendorFollowUpPanel";
import { InvoiceListingCell } from "./components/POVendorInvoiceSection";
import { UploadVendorInvoiceDialog } from "./components/UploadVendorInvoiceDialog";
import { addPOFollowUp, canAddPOFollowUp } from "./po-followup-data";
import { canUploadPOInvoice } from "./po-invoice-utils";
import { exportPOListingCsv } from "./po-export-utils";
import { computePOListingKpis } from "@/lib/procurement/listing-kpis";
import { POListingKpiRow } from "../components/listing/ListingKpiRows";
import { ProcCompactKpi, ProcCompactKpiGrid } from "../components/analytics/ProcCompactKpi";

type TabId = "all" | "draft" | "pending_approval" | "rejected" | "po_return";

const TABS: { value: TabId; label: string }[] = [
  { value: "all", label: "PO" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Approval" },
  { value: "rejected", label: "Rejected" },
  { value: "po_return", label: "PO Return" },
];

interface ReturnRecord {
  id: number;
  returnNumber: string;
  poNumber: string;
  vendor: string;
  returnDate: string;
  reason: string;
  items: number;
  amount: number;
  status: "pending" | "approved" | "processed";
}

const RETURNS_SEED: ReturnRecord[] = [
  { id: 1, returnNumber: "PR-2024-001", poNumber: "PO-2024-001", vendor: "Agro Chem Distributors",  returnDate: "2024-01-22", reason: "Damaged packaging",    items: 2, amount: 42500, status: "processed" },
  { id: 2, returnNumber: "PR-2024-002", poNumber: "PO-2024-003", vendor: "Fertilizer World",        returnDate: "2024-02-10", reason: "Quality mismatch",     items: 1, amount: 28000, status: "approved" },
  { id: 3, returnNumber: "PR-2024-003", poNumber: "PO-2024-002", vendor: "Seed Corp India Pvt Ltd", returnDate: "2024-02-18", reason: "Short expiry",         items: 3, amount: 15600, status: "pending" },
];

const RETURN_STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400" },
  approved:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500" },
  processed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

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

  const [returnSearch, setReturnSearch] = useState("");

  const visibleReturns = useMemo(() => {
    return returnSearch.trim()
      ? RETURNS_SEED.filter(
          (r) =>
            r.returnNumber.toLowerCase().includes(returnSearch.toLowerCase()) ||
            r.vendor.toLowerCase().includes(returnSearch.toLowerCase())
        )
      : RETURNS_SEED;
  }, [returnSearch]);
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
    (["draft", "pending_approval", "rejected"] as TabId[]).forEach((s) => {
      if (s !== "all") c[s] = records.filter((r) => r.status === s).length;
    });
    c["po_return"] = RETURNS_SEED.length;
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
            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-[400]">
            <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${row.id}`)} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            {["draft", "rejected"].includes(row.status) && (
              <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${row.id}/edit`)} className="cursor-pointer">
                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {row.status === "draft" && (
              <DropdownMenuItem onClick={() => { updateOne(submitPO(row)); setToast({ msg: "PO submitted.", type: "success" }); }} className="cursor-pointer">
                <Send className="w-3.5 h-3.5 mr-2" /> Submit
              </DropdownMenuItem>
            )}
            {row.status === "pending_approval" && (
              <>
                <DropdownMenuItem onClick={() => { setApprovalTarget(row); setApprovalAction("approve"); setApprovalOpen(true); }} className="cursor-pointer">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setApprovalTarget(row); setApprovalAction("reject"); setApprovalOpen(true); }} className="cursor-pointer">
                  <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                </DropdownMenuItem>
              </>
            )}
            {canUploadPOInvoice(row) && (
              <DropdownMenuItem onClick={() => openUpload(row, row.status === "invoice_uploaded")} className="cursor-pointer">
                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Invoice
              </DropdownMenuItem>
            )}
            {canAddPOFollowUp(row) && (
              <DropdownMenuItem onClick={() => { setFollowUpTarget(row); setFollowUpOpen(true); }} className="cursor-pointer">
                <MessageSquare className="w-3.5 h-3.5 mr-2" /> Add Follow-up
              </DropdownMenuItem>
            )}
            {canShortClosePO(row) && (
              <DropdownMenuItem onClick={() => { setShortCloseTarget(row); setShortCloseOpen(true); }} className="cursor-pointer">
                <Scissors className="w-3.5 h-3.5 mr-2" /> Short Close PO
              </DropdownMenuItem>
            )}
            {["approved", "invoice_uploaded"].includes(row.status) && (
              <DropdownMenuItem onClick={() => { updateOne(closePO(row)); setToast({ msg: "PO closed.", type: "success" }); }} className="cursor-pointer">
                Close PO
              </DropdownMenuItem>
            )}
            {!["closed", "cancelled", "short_closed"].includes(row.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => { updateOne(cancelPO(row)); setToast({ msg: "PO cancelled.", type: "success" }); }}>
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
      onTabChange={(id) => {
        setTab(id as TabId);
        router.replace(`/procurement/purchase-orders?tab=${id}`);
      }}
      metrics={<POListingKpiRow kpis={poListingKpis} />}
    >
      {tab === "po_return" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
              <Input
                value={returnSearch}
                onChange={(e) => setReturnSearch(e.target.value)}
                placeholder="Search returns…"
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Return No.","PO Reference","Vendor","Return Date","Reason","Items","Amount","Status",""].map((h, i) => (
                    <th key={i} className={cn("px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap", i === 8 && "w-10")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleReturns.map(rec => (
                  <tr key={rec.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{rec.returnNumber}</span></td>
                    <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{rec.poNumber}</span></td>
                    <td className="px-4 py-2 text-xs font-medium">{rec.vendor}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.returnDate}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{rec.reason}</td>
                    <td className="px-4 py-2 text-xs font-medium">{rec.items}</td>
                    <td className="px-4 py-2 text-xs font-semibold">₹{rec.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">
                      {(() => {
                        const cfg = RETURN_STATUS_CFG[rec.status] ?? RETURN_STATUS_CFG.pending;
                        return (
                          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                            {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 z-[400]">
                          <DropdownMenuItem className="cursor-pointer"><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{visibleReturns.length}</span> of <span className="font-medium text-foreground">{RETURNS_SEED.length}</span> returns</p>
            </div>
          </div>
        </div>
      ) : (
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
            onExport={() => exportPOListingCsv(filtered)}
            currentFilters={filters}
            currentSort={sort}
          />
        </div>
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
