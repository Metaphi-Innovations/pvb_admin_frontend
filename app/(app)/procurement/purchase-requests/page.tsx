"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit2, Send, CheckCircle2, XCircle, ShoppingCart, Plus, MoreHorizontal } from "lucide-react";
import { Toast } from "../components/ProcurementUI";
import { ProcurementApprovalModal } from "../components/ProcurementApprovalModal";
import { ProcAvatar, HighlightText } from "../design/proc-design";
import { useFlashToast } from "../hooks/useFlashToast";
import { applySearch, sortRows, type SortDir } from "../hooks/useListingFilters";
import { formatListingDate } from "../components/listing/ListingCells";
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
import { computePRListingKpis } from "@/lib/procurement/listing-kpis";
import { PRListingKpiRow } from "../components/listing/ListingKpiRows";

type TabId = "all" | PRListStatus;

const TABS: { value: TabId; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: "Draft" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Pending Approval" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Pending" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Rejected" },
  pending_po: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Pending PO" },
  partially_converted: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Partially Converted" },
  fully_converted: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Fully Converted" },
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

export default function PurchaseRequestsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<PurchaseRequest[]>([]);
  const [tab, setTab] = useState<TabId>("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalTarget, setApprovalTarget] = useState<PurchaseRequest | null>(null);

  // MasterListing States
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "prDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

    // Tab filter
    if (tab !== "all") r = r.filter((x) => x.status === tab);

    // MasterListing Filters
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;
      if (key === "search") {
        r = applySearch(r, val as string, (x) => [x.prNumber, x.requestedBy, x.remarks, x.createdBy]);
      } else if (key === "requestedBy") {
        const selected = val as string[];
        if (selected.length) r = r.filter((x) => selected.includes(x.requestedBy));
      } else if (key === "approvalStatus") {
        const selected = val as string[];
        if (selected.length) r = r.filter((x) => selected.includes(getPRApprovalStatus(x)));
      } else if (key === "poStatus") {
        const selected = val as string[];
        if (selected.length) r = r.filter((x) => selected.includes(getPRPoConversionStatus(x)));
      } else if (key === "requiredByDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) r = r.filter((x) => x.requiredByDate >= range.fromDate);
        if (range.toDate) r = r.filter((x) => x.requiredByDate <= range.toDate);
      }
    });

    // Sorting
    if (sort.key && sort.direction !== "none") {
      r = sortRows(r, sort.key, sort.direction as SortDir, {
        prNumber: (x) => x.prNumber,
        prDate: (x) => x.prDate,
        requestedBy: (x) => x.requestedBy,
        requiredByDate: (x) => x.requiredByDate,
        totalItems: (x) => getPRTotalItems(x),
        totalQty: (x) => getPRTotalQuantity(x),
        approvalStatus: (x) => getPRApprovalStatus(x),
        poStatus: (x) => getPRPoConversionStatus(x),
      });
    }

    return r;
  }, [records, tab, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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

  const prListingKpis = useMemo(() => computePRListingKpis(records), [records]);

  const columns: ColumnConfig<PurchaseRequest>[] = [
    {
      key: "prNumber",
      header: "PR No.",
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-semibold text-brand-700 text-xs">
            <HighlightText text={row.prNumber} query={(filters.search as string) || ""} />
          </p>
          <p className="text-[11px] text-muted-foreground">{formatListingDate(row.prDate)}</p>
        </div>
      ),
    },
    {
      key: "requestedBy",
      header: "Requested By",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: requesters.map(r => ({ label: r, value: r })),
      render: (val, row) => (
        <span className="inline-flex items-center gap-2 text-xs text-foreground font-medium py-1">
          <ProcAvatar name={row.requestedBy} />
          <HighlightText text={row.requestedBy} query={(filters.search as string) || ""} />
        </span>
      ),
    },
    {
      key: "requiredByDate",
      header: "Required By",
      sortable: true,
      filterable: true,
      filterType: "date",
      render: (val, row) => (
        <span className="text-xs text-muted-foreground tabular-nums py-1">
          {row.requiredByDate ? formatListingDate(row.requiredByDate) : "—"}
        </span>
      ),
    },
    {
      key: "totalItems",
      header: "Items",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs tabular-nums text-foreground py-1">
          {getPRTotalItems(row)}
        </span>
      ),
    },
    {
      key: "totalQty",
      header: "Total Base Qty",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs tabular-nums text-foreground py-1">
          {getPRTotalQuantity(row)}
        </span>
      ),
    },
    {
      key: "approvalStatus",
      header: "Approval Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Draft", value: "draft" },
        { label: "Pending Approval", value: "pending_approval" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
      render: (val, row) => {
        const approvalStatus = getPRApprovalStatus(row);
        return <StatusPill status={approvalStatus} />;
      },
    },
    {
      key: "currentApprover",
      header: "Current Approver",
      render: (val, row) => (
        <span className="text-xs text-muted-foreground py-1">
          {getPRCurrentApprover(row)}
        </span>
      ),
    },
    {
      key: "poStatus",
      header: "PO Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Pending PO", value: "pending_po" },
        { label: "Partially Converted", value: "partially_converted" },
        { label: "Fully Converted", value: "fully_converted" },
      ],
      render: (val, row) => {
        const poStatus = getPRPoConversionStatus(row);
        return <StatusPill status={poStatus} />;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (val, row) => {
        const approvalStatus = getPRApprovalStatus(row);
        const poStatus = getPRPoConversionStatus(row);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 z-[400]">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-requests/${row.id}`)} className="cursor-pointer">
                <Eye className="w-3.5 h-3.5 mr-2" /> View
              </DropdownMenuItem>
              {["draft", "rejected"].includes(approvalStatus) && (
                <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-requests/${row.id}/edit`)} className="cursor-pointer">
                  <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              {approvalStatus === "draft" && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    const updated = submitPR(row);
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
                  <DropdownMenuItem onClick={() => { setApprovalTarget(row); setApprovalAction("approve"); setApprovalOpen(true); }} className="cursor-pointer">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setApprovalTarget(row); setApprovalAction("reject"); setApprovalOpen(true); }} className="cursor-pointer">
                    <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                  </DropdownMenuItem>
                </>
              )}
              {approvalStatus === "approved" && poStatus !== "fully_converted" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/new?prId=${row.id}`)} className="cursor-pointer">
                    <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Create PO
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <ListingContainer
      title="Purchase Request"
      titleIcon={ShoppingCart}
      tabs={TABS.map((t) => ({
        value: t.value,
        label: `${t.label}${tabCounts[t.value] != null ? ` (${tabCounts[t.value]})` : ""}`,
      }))}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      metrics={<PRListingKpiRow kpis={prListingKpis} />}
    >
      <div>
        <MasterListing<PurchaseRequest>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          onAdd={() => router.push("/procurement/purchase-requests/new")}
          addLabel="Create PR"
          emptyMessage="purchase requests"
          searchPlaceholder="Search PR no., requester, remarks…"
          onExport={undefined}
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
