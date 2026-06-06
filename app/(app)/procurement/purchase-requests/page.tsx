"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Download, Eye, Edit2, Send, CheckCircle2, XCircle, ShoppingCart, Plus, Search, SlidersHorizontal, MoreHorizontal, SearchX } from "lucide-react";
import { Toast } from "../components/ProcurementUI";
import { ProcurementApprovalModal } from "../components/ProcurementApprovalModal";
import { ProcButton, ProcBadge, ProcAvatar, HighlightText, PROC } from "../design/proc-design";
import { ProcInput } from "../design/proc-design";
import { useFlashToast } from "../hooks/useFlashToast";
import { useDebounce } from "../hooks/useDebounce";
import { useListingFilters, applySearch, sortRows, type SortDir } from "../hooks/useListingFilters";
import { ProcListingHeader } from "../components/listing/ProcListingHeader";
import { ListingTableShell, SortableTh, ListingEmpty } from "../components/listing/ListingTable";
import { StackedCell, formatListingDate } from "../components/listing/ListingCells";
import { ActiveFilterPills, FilterPanelPR, statusValuesToLabels } from "../components/listing/FilterPanels";
import {
  getPRApprovalStatus,
  getPRPoConversionStatus,
  getPRCurrentApprover,
  getPRTotalItems,
  getPRTotalQuantity,
} from "./pr-listing-utils";
import {
  type PRListStatus,
  type PurchaseRequest,
  loadPurchaseRequests,
  savePurchaseRequests,
  LIST_TAB_STATUSES,
  submitPR,
  approvePR,
  rejectPR,
} from "./pr-data";
import { filterPRsForAnalytics } from "../analytics/proc-analytics-utils";
import { computePRAnalytics } from "../analytics/pr-analytics";
import { PRAnalyticsDashboard } from "../components/analytics/PRAnalyticsDashboard";

type TabId = "all" | PRListStatus;

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending_approval", label: "Pending Approval" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const DEFAULT_STATE = {
  search: "",
  sortCol: "prDate",
  sortDir: "desc" as SortDir,
  filters: {
    status: [] as string[],
    requestedBy: [] as string[],
    dateFrom: "",
    dateTo: "",
  },
};

export default function PurchaseRequestsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<PurchaseRequest[]>([]);
  const [tab, setTab] = useState<TabId>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalTarget, setApprovalTarget] = useState<PurchaseRequest | null>(null);

  const { state, update, setFilter, clearAllFilters, activeFilterCount } = useListingFilters(
    DEFAULT_STATE,
    ["status", "requestedBy", "dateFrom", "dateTo"],
  );
  const debouncedSearch = useDebounce(state.search, 300);
  useFlashToast(setToast);

  const refresh = useCallback(() => setRecords(loadPurchaseRequests()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const requesters = useMemo(
    () => Array.from(new Set(records.map((r) => r.requestedBy))).filter(Boolean).sort(),
    [records],
  );

  const tabCounts = useMemo(() => {
    const c: Partial<Record<TabId, number>> = { all: records.length };
    LIST_TAB_STATUSES.forEach((s) => {
      c[s] = records.filter((r) => r.status === s).length;
    });
    return c;
  }, [records]);

  const filtered = useMemo(() => {
    let r = [...records];
    if (tab !== "all") r = r.filter((x) => x.status === tab);
    const f = state.filters;
    if ((f.status as string[]).length) r = r.filter((x) => (f.status as string[]).includes(x.status));
    if ((f.requestedBy as string[]).length) r = r.filter((x) => (f.requestedBy as string[]).includes(x.requestedBy));
    if (f.dateFrom) r = r.filter((x) => x.prDate >= (f.dateFrom as string));
    if (f.dateTo) r = r.filter((x) => x.prDate <= (f.dateTo as string));
    r = applySearch(r, debouncedSearch, (x) => [x.prNumber, x.requestedBy, x.remarks, x.createdBy]);
    return sortRows(r, state.sortCol, state.sortDir, {
      prNumber: (x) => x.prNumber,
      prDate: (x) => x.prDate,
      requestedBy: (x) => x.requestedBy,
      requiredByDate: (x) => x.requiredByDate,
      totalItems: (x) => getPRTotalItems(x),
      totalQty: (x) => getPRTotalQuantity(x),
      approvalStatus: (x) => getPRApprovalStatus(x),
      poStatus: (x) => getPRPoConversionStatus(x),
    });
  }, [records, tab, state.filters, debouncedSearch, state.sortCol, state.sortDir]);

  const handleSort = (col: string) => {
    update((prev) => ({
      ...prev,
      sortCol: col,
      sortDir: prev.sortCol === col && prev.sortDir === "desc" ? "asc" : prev.sortCol === col ? "desc" : "desc",
    }));
  };

  const filterPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    const st = state.filters.status as string[];
    if (st.length) pills.push({ key: "status", label: `Status: ${statusValuesToLabels(st).join(", ")}` });
    const rb = state.filters.requestedBy as string[];
    if (rb.length) pills.push({ key: "requestedBy", label: `Requested By: ${rb.join(", ")}` });
    if (state.filters.dateFrom) pills.push({ key: "dateFrom", label: `From: ${state.filters.dateFrom}` });
    if (state.filters.dateTo) pills.push({ key: "dateTo", label: `To: ${state.filters.dateTo}` });
    return pills;
  }, [state.filters]);

  const removePill = (key: string) => {
    if (key === "dateFrom" || key === "dateTo") setFilter(key, "");
    else setFilter(key, []);
  };

  const handleApprovalConfirm = (remarks: string) => {
    if (!approvalTarget) return;
    const updated =
      approvalAction === "approve"
        ? approvePR(approvalTarget, remarks || undefined)
        : rejectPR(approvalTarget, remarks);
    savePurchaseRequests(loadPurchaseRequests().map((p) => (p.id === updated.id ? updated : p)));
    setToast({ msg: approvalAction === "approve" ? "PR approved." : "PR rejected.", type: "success" });
    refresh();
    setApprovalOpen(false);
  };

  const hasFiltersOrSearch = activeFilterCount > 0 || debouncedSearch.trim().length > 0;

  const analyticsBase = useMemo(
    () =>
      filterPRsForAnalytics(records, {
        status: state.filters.status as string[],
        requestedBy: state.filters.requestedBy as string[],
        dateFrom: state.filters.dateFrom as string,
        dateTo: state.filters.dateTo as string,
        search: debouncedSearch,
      }),
    [records, state.filters, debouncedSearch],
  );

  const prAnalytics = useMemo(() => computePRAnalytics(analyticsBase), [analyticsBase]);

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)]" style={{ backgroundColor: PROC.pageBg }}>
        <ProcListingHeader
          breadcrumbs={[{ label: "Procurement", href: "/procurement/purchase-requests" }, { label: "Purchase Requests" }]}
          title="Purchase Request"
          action={
            <Link href="/procurement/purchase-requests/new">
              <ProcButton variant="primary">
                <Plus className="w-3.5 h-3.5" /> Create PR
              </ProcButton>
            </Link>
          }
          tabs={TABS}
          activeTab={tab}
          onTabChange={(id) => setTab(id as TabId)}
          tabCounts={tabCounts as Record<string, number>}
        />

        <div className="max-w-[1680px] mx-auto px-6 py-4">
          <PRAnalyticsDashboard analytics={prAnalytics} />

          <ListingTableShell
            countLabel={`Showing ${filtered.length} of ${records.length} records`}
            toolbar={
              <>
                <div className="relative w-full max-w-[320px]">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9AAAC5]" />
                  <ProcInput
                    placeholder="Search PR no., requester, remarks…"
                    value={state.search}
                    onChange={(e) => update({ search: e.target.value })}
                    className="pl-9 w-full"
                  />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <ProcButton
                    variant="outline"
                    size="sm"
                    onClick={() => setFilterOpen((o) => !o)}
                    className="relative"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </ProcButton>
                  <ProcButton variant="outline" size="sm">
                    <Download className="w-3.5 h-3.5" /> Export
                  </ProcButton>
                </div>
              </>
            }
            filterPanel={
              filterOpen ? (
                <FilterPanelPR
                  requestedByOptions={requesters}
                  filters={state.filters}
                  onChange={setFilter}
                  onClearAll={clearAllFilters}
                  activeCount={activeFilterCount}
                />
              ) : null
            }
            filterPills={
              <ActiveFilterPills pills={filterPills} onRemove={removePill} onClearAll={clearAllFilters} />
            }
          >
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[#DDE3EF]">
                  <SortableTh label="PR No." colKey="prNumber" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} hasFilter={false} />
                  <SortableTh label="Requested By" colKey="requestedBy" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} hasFilter={(state.filters.requestedBy as string[]).length > 0} />
                  <SortableTh label="Required By" colKey="requiredByDate" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="Items" colKey="totalItems" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="Total Qty" colKey="totalQty" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <SortableTh label="Approval Status" colKey="approvalStatus" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} hasFilter={(state.filters.status as string[]).length > 0} />
                  <th className="px-3 h-11 text-left text-[11px] font-bold uppercase text-[#9AAAC5]" style={{ backgroundColor: "#F7F9FC" }}>Current Approver</th>
                  <SortableTh label="PO Status" colKey="poStatus" sortCol={state.sortCol} sortDir={state.sortDir} onSort={handleSort} />
                  <th className="w-10 px-2 h-11 text-right text-[11px] font-bold uppercase text-[#9AAAC5]" style={{ backgroundColor: "#F7F9FC" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <ListingEmpty
                        icon={<SearchX className="w-10 h-10" />}
                        title={hasFiltersOrSearch ? "No records match your filters" : "No purchase requests yet"}
                        subtitle={hasFiltersOrSearch ? "Try adjusting your search or clearing some filters." : undefined}
                        action={
                          hasFiltersOrSearch ? (
                            <ProcButton variant="outline" onClick={clearAllFilters}>
                              Clear all filters
                            </ProcButton>
                          ) : (
                            <Link href="/procurement/purchase-requests/new">
                              <ProcButton variant="primary">Create PR</ProcButton>
                            </Link>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((rec) => {
                    const approvalStatus = getPRApprovalStatus(rec);
                    const poStatus = getPRPoConversionStatus(rec);
                    return (
                    <tr
                      key={rec.id}
                      className="border-b cursor-pointer group hover:bg-[#F4F7FE]"
                      style={{ borderColor: "#F0F3FA" }}
                      onClick={() => router.push(`/procurement/purchase-requests/${rec.id}`)}
                    >
                      <td className="px-3">
                        <StackedCell
                          primary={<HighlightText text={rec.prNumber} query={debouncedSearch} />}
                          secondary={formatListingDate(rec.prDate)}
                        />
                      </td>
                      <td className="px-3">
                        <span className="inline-flex items-center gap-2 text-[13px] text-[#0A1628] py-2">
                          <ProcAvatar name={rec.requestedBy} />
                          <HighlightText text={rec.requestedBy} query={debouncedSearch} />
                        </span>
                      </td>
                      <td className="px-3 text-[13px] text-[#6B80A0] tabular-nums py-2">{rec.requiredByDate ? formatListingDate(rec.requiredByDate) : "—"}</td>
                      <td className="px-3 text-[13px] tabular-nums text-[#3D5473] py-2">{getPRTotalItems(rec)}</td>
                      <td className="px-3 text-[13px] tabular-nums text-[#3D5473] py-2">{getPRTotalQuantity(rec)}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <ProcBadge status={approvalStatus} />
                      </td>
                      <td className="px-3 text-[13px] text-[#6B80A0] py-2">{getPRCurrentApprover(rec)}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <ProcBadge status={poStatus} />
                      </td>
                      <td className="px-2 text-right py-2" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-brand-50">
                              <MoreHorizontal className="w-4 h-4 text-[#6B80A0]" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 z-[400]">
                            <DropdownMenuLabel className="text-[10px]">Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/procurement/purchase-requests/${rec.id}`}><Eye className="w-3.5 h-3.5 mr-2" /> View</Link>
                            </DropdownMenuItem>
                            {["draft", "rejected"].includes(approvalStatus) && (
                              <DropdownMenuItem asChild>
                                <Link href={`/procurement/purchase-requests/${rec.id}/edit`}><Edit2 className="w-3.5 h-3.5 mr-2" /> Edit</Link>
                              </DropdownMenuItem>
                            )}
                            {approvalStatus === "draft" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const updated = submitPR(rec);
                                  savePurchaseRequests(loadPurchaseRequests().map((p) => (p.id === updated.id ? updated : p)));
                                  refresh();
                                  setToast({ msg: "PR submitted.", type: "success" });
                                }}
                              >
                                <Send className="w-3.5 h-3.5 mr-2" /> Submit
                              </DropdownMenuItem>
                            )}
                            {approvalStatus === "pending_approval" && (
                              <>
                                <DropdownMenuItem onClick={() => { setApprovalTarget(rec); setApprovalAction("approve"); setApprovalOpen(true); }}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setApprovalTarget(rec); setApprovalAction("reject"); setApprovalOpen(true); }}>
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {approvalStatus === "approved" && poStatus !== "fully_converted" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/procurement/purchase-orders/new?prId=${rec.id}`}>
                                    <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Create PO
                                  </Link>
                                </DropdownMenuItem>
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

      <ProcurementApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        documentNo={approvalTarget?.prNumber ?? ""}
        documentLabel="Purchase Request"
        action={approvalAction}
        onConfirm={handleApprovalConfirm}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
