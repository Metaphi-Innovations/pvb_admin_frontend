"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  Search,
  SlidersHorizontal,
  Download,
  SearchX,
  Scissors,
  MessageSquare,
} from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { Toast } from "../components/ProcurementUI";
import { ProcurementApprovalModal } from "../components/ProcurementApprovalModal";
import { ProcButton, ProcBadge, ProcAvatar, HighlightText, PROC } from "../design/proc-design";
import { ProcInput } from "../design/proc-design";
import { useDebounce } from "../hooks/useDebounce";
import { useFlashToast } from "../hooks/useFlashToast";
import { useListingFilters, applySearch, sortRows, type SortDir } from "../hooks/useListingFilters";
import { ProcListingHeader } from "../components/listing/ProcListingHeader";
import { ListingTableShell, SortableTh, ListingEmpty } from "../components/listing/ListingTable";
import { StackedCell, formatListingDate } from "../components/listing/ListingCells";
import { ActiveFilterPills, FilterPanelPO, poStatusValuesToLabels } from "../components/listing/FilterPanels";
import {
  type POStatus,
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

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending_approval", label: "Pending Approval" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const LIST_STATUSES: POStatus[] = ["draft", "pending_approval", "approved", "rejected", "invoice_uploaded", "short_closed", "closed", "cancelled"];

const DEFAULT_STATE = {
  search: "",
  sortCol: "poDate",
  sortDir: "desc" as SortDir,
  filters: {
    status: [] as string[],
    supplier: [] as string[],
    prReference: [] as string[],
    dateFrom: "",
    dateTo: "",
  },
};

export default function PurchaseOrdersPageClient() {
  const router = useRouter();
  const [records, setRecords] = useState<PurchaseOrder[]>(() => loadPurchaseOrders());
  const [tab, setTab] = useState<TabId>("all");
  const [filterOpen, setFilterOpen] = useState(false);
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

  const { state, update, setFilter, clearAllFilters, activeFilterCount } = useListingFilters(
    DEFAULT_STATE,
    ["status", "supplier", "prReference", "dateFrom", "dateTo"],
  );
  const debouncedSearch = useDebounce(state.search, 300);
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
    const f = state.filters;
    if ((f.status as string[]).length) r = r.filter((x) => (f.status as string[]).includes(x.status));
    if ((f.supplier as string[]).length) r = r.filter((x) => (f.supplier as string[]).includes(x.supplierName));
    if ((f.prReference as string[]).length) r = r.filter((x) => (f.prReference as string[]).includes(x.sourcePrNumber));
    if (f.dateFrom) r = r.filter((x) => x.poDate >= (f.dateFrom as string));
    if (f.dateTo) r = r.filter((x) => x.poDate <= (f.dateTo as string));
    r = applySearch(r, debouncedSearch, (x) => [x.poNumber, x.sourcePrNumber, x.supplierName]);
    return sortRows(r, state.sortCol, state.sortDir, {
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
  }, [records, tab, state.filters, debouncedSearch, state.sortCol, state.sortDir, followUpRev, invoiceRev]);

  const handleSort = (col: string) => {
    update((prev) => ({
      ...prev,
      sortCol: col,
      sortDir: prev.sortCol === col && prev.sortDir === "desc" ? "asc" : prev.sortCol === col ? "desc" : "desc",
    }));
  };

  const updateOne = (updated: PurchaseOrder) => {
    savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === updated.id ? updated : p)));
    refresh();
  };

  const filterPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    const st = state.filters.status as string[];
    if (st.length) pills.push({ key: "status", label: `Status: ${poStatusValuesToLabels(st).join(", ")}` });
    const sup = state.filters.supplier as string[];
    if (sup.length) pills.push({ key: "supplier", label: `Supplier: ${sup.join(", ")}` });
    const pr = state.filters.prReference as string[];
    if (pr.length) pills.push({ key: "prReference", label: `PR: ${pr.join(", ")}` });
    if (state.filters.dateFrom) pills.push({ key: "dateFrom", label: `From: ${state.filters.dateFrom}` });
    if (state.filters.dateTo) pills.push({ key: "dateTo", label: `To: ${state.filters.dateTo}` });
    return pills;
  }, [state.filters]);

  const hasFiltersOrSearch = activeFilterCount > 0 || debouncedSearch.trim().length > 0;

  const analyticsBase = useMemo(
    () =>
      filterPOsForAnalytics(records, {
        status: state.filters.status as string[],
        supplier: state.filters.supplier as string[],
        dateFrom: state.filters.dateFrom as string,
        dateTo: state.filters.dateTo as string,
        search: debouncedSearch,
      }),
    [records, state.filters, debouncedSearch],
  );

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

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)]" style={{ backgroundColor: PROC.pageBg }}>
        <ProcListingHeader
          breadcrumbs={[{ label: "Procurement", href: "/procurement/purchase-orders" }, { label: "Purchase Orders" }]}
          title="Purchase Order"
          action={
            <Link href="/procurement/purchase-orders/new">
              <ProcButton variant="primary">
                <Plus className="w-3.5 h-3.5" /> Create PO
              </ProcButton>
            </Link>
          }
          tabs={TABS}
          activeTab={tab}
          onTabChange={(id) => setTab(id as TabId)}
          tabCounts={tabCounts as Record<string, number>}
        />

        <div className="max-w-[1680px] mx-auto px-6 py-4">
          <POAnalyticsDashboard analytics={poAnalytics} />

          <ListingTableShell
            countLabel={`Showing ${filtered.length} of ${records.length} records`}
            toolbar={
              <>
                <div className="relative w-full max-w-[320px]">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9AAAC5]" />
                  <ProcInput
                    placeholder="Search PO no., PR no., supplier…"
                    value={state.search}
                    onChange={(e) => update({ search: e.target.value })}
                    className="pl-9 w-full"
                  />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <ProcButton variant="outline" size="sm" onClick={() => setFilterOpen((o) => !o)} className="relative">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </ProcButton>
                  <ProcButton variant="outline" size="sm" onClick={() => exportPOListingCsv(filtered)}>
                    <Download className="w-3.5 h-3.5" /> Export
                  </ProcButton>
                </div>
              </>
            }
            filterPanel={
              filterOpen ? (
                <FilterPanelPO
                  supplierOptions={suppliers}
                  prOptions={prRefs}
                  filters={state.filters}
                  onChange={setFilter}
                  onClearAll={clearAllFilters}
                  activeCount={activeFilterCount}
                />
              ) : null
            }
            filterPills={
              <ActiveFilterPills
                pills={filterPills}
                onRemove={(key) => {
                  if (key === "dateFrom" || key === "dateTo") setFilter(key, "");
                  else setFilter(key, []);
                }}
                onClearAll={clearAllFilters}
              />
            }
          >
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-[#DDE3EF]">
                  <SortableTh label="PO No." colKey="poNumber" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="Vendor" colKey="supplierName" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} hasFilter={(state.filters.supplier as string[]).length > 0} />
                  <SortableTh label="PR No." colKey="sourcePrNumber" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} hasFilter={(state.filters.prReference as string[]).length > 0} />
                  <SortableTh label="Items" colKey="totalItems" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="PO Amount" colKey="grandTotal" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="Invoice" colKey="invoiceStatus" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="3-Way Match" colKey="threeWayMatch" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="PO Status" colKey="status" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} hasFilter={(state.filters.status as string[]).length > 0} />
                  <SortableTh label="Follow-up" colKey="followUp" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <th className="w-10 px-2 h-11 text-right text-[11px] font-bold uppercase text-[#9AAAC5]" style={{ backgroundColor: "#F7F9FC" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <ListingEmpty
                        icon={<SearchX className="w-10 h-10" />}
                        title={hasFiltersOrSearch ? "No records match your filters" : "No purchase orders yet"}
                        subtitle={hasFiltersOrSearch ? "Try adjusting your search or clearing some filters." : undefined}
                        action={
                          hasFiltersOrSearch ? (
                            <ProcButton variant="outline" onClick={clearAllFilters}>Clear all filters</ProcButton>
                          ) : (
                            <Link href="/procurement/purchase-orders/new"><ProcButton variant="primary">Create PO</ProcButton></Link>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((rec) => {
                    const vendorSecondary = getVendorSecondaryLine(rec);
                    void followUpRev;
                    void invoiceRev;
                    return (
                    <tr
                      key={rec.id}
                      className="border-b cursor-pointer group hover:bg-[#F4F7FE]"
                      style={{ borderColor: "#F0F3FA" }}
                      onClick={() => router.push(`/procurement/purchase-orders/${rec.id}`)}
                    >
                      <td className="px-3">
                        <StackedCell
                          primary={<HighlightText text={rec.poNumber} query={debouncedSearch} />}
                          secondary={formatListingDate(rec.poDate)}
                        />
                      </td>
                      <td className="px-3">
                        <StackedCell
                          primary={
                            <span className="inline-flex items-center gap-2">
                              <ProcAvatar name={rec.supplierName} />
                              <HighlightText text={rec.supplierName} query={debouncedSearch} />
                            </span>
                          }
                          secondary={vendorSecondary}
                        />
                      </td>
                      <td className="px-3 text-[13px] text-[#6B80A0] py-2">
                        {rec.sourcePrNumber ? <HighlightText text={rec.sourcePrNumber} query={debouncedSearch} /> : "—"}
                      </td>
                      <td className="px-3 text-[13px] tabular-nums text-[#3D5473] py-2">{getPOTotalItems(rec)}</td>
                      <td className="px-3 text-[13px] font-semibold tabular-nums text-[#0A1628] py-2">{formatCurrency(rec.summary.grandTotal)}</td>
                      <td className="px-3">
                        <InvoiceListingCell
                          po={rec}
                          onView={() => router.push(`/procurement/purchase-orders/${rec.id}#vendor-invoice`)}
                          onUpload={() => openUpload(rec)}
                        />
                      </td>
                      <td className="px-3">
                        <ThreeWayMatchListingCell
                          po={rec}
                          onView={() => router.push(`/procurement/purchase-orders/${rec.id}#three-way-match`)}
                        />
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><ProcBadge status={rec.status} /></td>
                      <td className="px-3">
                        <FollowUpListingCell
                          poId={rec.id}
                          onViewHistory={() => router.push(`/procurement/purchase-orders/${rec.id}#follow-up-history`)}
                        />
                      </td>
                      <td className="px-2 text-right py-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-brand-50">
                              <MoreHorizontal className="w-4 h-4 text-[#6B80A0]" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 z-[400]">
                            <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${rec.id}`)}><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                            {["draft", "rejected"].includes(rec.status) && (
                              <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${rec.id}/edit`)}><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                            )}
                            {rec.status === "draft" && (
                              <DropdownMenuItem onClick={() => { updateOne(submitPO(rec)); setToast({ msg: "PO submitted.", type: "success" }); }}><Send className="w-3.5 h-3.5 mr-2" /> Submit</DropdownMenuItem>
                            )}
                            {rec.status === "pending_approval" && (
                              <>
                                <DropdownMenuItem onClick={() => { setApprovalTarget(rec); setApprovalAction("approve"); setApprovalOpen(true); }}><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setApprovalTarget(rec); setApprovalAction("reject"); setApprovalOpen(true); }}><XCircle className="w-3.5 h-3.5 mr-2" /> Reject</DropdownMenuItem>
                              </>
                            )}
                            {canUploadPOInvoice(rec) && (
                              <DropdownMenuItem onClick={() => openUpload(rec, rec.status === "invoice_uploaded")}>
                                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Invoice
                              </DropdownMenuItem>
                            )}
                            {canAddPOFollowUp(rec) && (
                              <DropdownMenuItem onClick={() => { setFollowUpTarget(rec); setFollowUpOpen(true); }}>
                                <MessageSquare className="w-3.5 h-3.5 mr-2" /> Add Follow-up
                              </DropdownMenuItem>
                            )}
                            {canShortClosePO(rec) && (
                              <DropdownMenuItem onClick={() => { setShortCloseTarget(rec); setShortCloseOpen(true); }}>
                                <Scissors className="w-3.5 h-3.5 mr-2" /> Short Close PO
                              </DropdownMenuItem>
                            )}
                            {["approved", "invoice_uploaded"].includes(rec.status) && (
                              <DropdownMenuItem onClick={() => { updateOne(closePO(rec)); setToast({ msg: "PO closed.", type: "success" }); }}>Close PO</DropdownMenuItem>
                            )}
                            {!["closed", "cancelled", "short_closed"].includes(rec.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => { updateOne(cancelPO(rec)); setToast({ msg: "PO cancelled.", type: "success" }); }}>Cancel PO</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ListingTableShell>
        </div>
      </div>

      {uploadTarget && (
        <UploadVendorInvoiceDialog
          open={uploadOpen}
          onClose={() => { setUploadOpen(false); setUploadTarget(null); }}
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
    </AppLayout>
  );
}
