"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  Plus,
  Download,
  MoreVertical,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  TrendingUp,
  ShoppingBag,
  FileText,
  Package,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import type { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import CancelOrderDialog from "./components/CancelOrderDialog";
import ApproveOrderDialog from "./components/ApproveOrderDialog";
import RejectOrderDialog from "./components/RejectOrderDialog";
import { SampleReturnTab } from "./components/SampleReturnTab";
import { getSampleReturnRecords } from "./sample-return-data";
import { downloadProformaInvoice } from "./pi-document";
import {
  type SalesOrder,
  type OrderStatus,
  loadOrders,
  formatOrderStatus,
  ORDER_STATUS_OPTIONS,
  canEditOrder,
  canCancelOrder,
  canDownloadPI,
  canGeneratePackingList,
  hydrateOrderLineItems,
  isApprovalRelatedOrder,
  getSampleOrderDisplayRecipient,
  approveSalesOrder,
  canApproveOrder,
} from "./orders-data";
import { useSampleOrders, useUpdateSampleOrderStatus, useSampleOrderFilterOptions } from "@/hooks/sales/use-sample-orders";
import { mapFrontendStatusToBackend, SampleOrderService } from "@/services/sample-order.service";

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  packed: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  dispatched: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
};

const FILTER_STATUSES: OrderStatus[] = [...ORDER_STATUS_OPTIONS.map((o) => o.value)];

type OrderListTab = "all" | "draft" | "pending_approval" | "rejected" | "sales_return";

interface SalesReturnRecord {
  id: number;
  returnNumber: string;
  soNumber: string;
  customerName: string;
  returnDate: string;
  reason: string;
  items: number;
  amount: number;
  status: "pending" | "approved" | "processed";
}

const SALES_RETURNS_SEED: SalesReturnRecord[] = [
  { id: 1, returnNumber: "SR-2024-001", soNumber: "SM-2024-001", customerName: "Green Valley Agro", returnDate: "2024-01-22", reason: "Wrong product delivered", items: 2, amount: 42500, status: "processed" },
  { id: 2, returnNumber: "SR-2024-002", soNumber: "SM-2024-003", customerName: "Kisan Fertilizers Ltd", returnDate: "2024-02-10", reason: "Damaged during transit", items: 1, amount: 28000, status: "approved" },
  { id: 3, returnNumber: "SR-2024-003", soNumber: "SM-2024-002", customerName: "Farmtech Solutions", returnDate: "2024-02-18", reason: "Short expiry", items: 3, amount: 15600, status: "pending" },
];

const RETURN_STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  approved: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  processed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

function matchesOrderTab(order: SalesOrder, tab: OrderListTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "draft":
      return order.status === "draft";
    case "pending_approval":
      return order.status === "pending_approval";
    case "rejected":
      return order.status === "rejected";
    default:
      return true;
  }
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {formatOrderStatus(status as OrderStatus)}
    </span>
  );
}

function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  colKey: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: string) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? (
          <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
        )}
      </div>
    </th>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  destructive,
  disabled,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
        disabled
          ? "text-muted-foreground/50 cursor-not-allowed"
          : destructive
            ? "text-red-600 hover:bg-red-50"
            : "text-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderListTab>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "orderDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [returnSearch, setReturnSearch] = useState("");

  const visibleReturns = useMemo(() => {
    return returnSearch.trim()
      ? SALES_RETURNS_SEED.filter(
        (r) =>
          r.returnNumber.toLowerCase().includes(returnSearch.toLowerCase()) ||
          r.customerName.toLowerCase().includes(returnSearch.toLowerCase())
      )
      : SALES_RETURNS_SEED;
  }, [returnSearch]);

  const [cancelOrder, setCancelOrder] = useState<SalesOrder | null>(null);
  const [approveOrder, setApproveOrder] = useState<SalesOrder | null>(null);
  const [rejectOrder, setRejectOrder] = useState<SalesOrder | null>(null);

  const apiFilters = useMemo(() => {
    const f: Record<string, any> = {};
    if (activeTab && activeTab !== "all" && activeTab !== "sales_return") {
      f.status = mapFrontendStatusToBackend(activeTab);
    }
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      f.status = filters.status.map(s => mapFrontendStatusToBackend(s));
    }
    if (filters.soNumber && Array.isArray(filters.soNumber) && filters.soNumber.length > 0) {
      f.order_no = filters.soNumber;
    }
    if (filters.customerName && Array.isArray(filters.customerName) && filters.customerName.length > 0) {
      f.salesperson = { username: filters.customerName };
    }
    return f;
  }, [filters, activeTab]);

  const SORT_KEY_TO_ORDERING: Record<string, string> = {
    soNumber: "order_no",
    customerName: "salesperson__username",
    orderDate: "order_date",
    status: "status",
    totalAmount: "grand_total",
    items: "items",
  };

  const ordering = useMemo(() => {
    if (!sort.key || sort.direction === "none") return undefined;
    const field = SORT_KEY_TO_ORDERING[sort.key] || sort.key;
    return sort.direction === "desc" ? `-${field}` : field;
  }, [sort]);

  const { data: listData, isLoading, refetch } = useSampleOrders({
    page,
    pageSize,
    search: filters.search as string,
    ordering,
    apiFilters,
  });

  const { data: allCountData } = useSampleOrders({
    page: 1,
    pageSize: 1,
    search: filters.search as string,
  });

  const { data: draftCountData } = useSampleOrders({
    page: 1,
    pageSize: 1,
    search: filters.search as string,
    apiFilters: { status: "DRAFT" },
  });

  const { data: approvalCountData } = useSampleOrders({
    page: 1,
    pageSize: 1,
    search: filters.search as string,
    apiFilters: { status: "SUBMITTED" },
  });

  const { data: rejectedCountData } = useSampleOrders({
    page: 1,
    pageSize: 1,
    search: filters.search as string,
    apiFilters: { status: "REJECTED" },
  });

  const { data: confirmedCountData } = useSampleOrders({
    page: 1,
    pageSize: 1,
    search: filters.search as string,
    apiFilters: { status: "APPROVED" },
  });

  const { data: dispatchedCountData } = useSampleOrders({
    page: 1,
    pageSize: 1,
    search: filters.search as string,
    apiFilters: { status: "DISPATCHED" },
  });

  const { data: deliveredCountData } = useSampleOrders({
    page: 1,
    pageSize: 1,
    search: filters.search as string,
    apiFilters: { status: "DELIVERED" },
  });

  const { data: orderNoFilterRaw } = useSampleOrderFilterOptions("order_no");
  const { data: salespersonFilterRaw } = useSampleOrderFilterOptions("salesperson__username");

  const updateStatusMutation = useUpdateSampleOrderStatus();

  const ordersList = listData?.items || [];
  const totalRecords = listData?.total || 0;

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "approval") {
      setActiveTab("pending_approval");
    } else if (tab === "all" || tab === "draft" || tab === "pending_approval" || tab === "rejected" || tab === "sales_return") {
      setActiveTab(tab as OrderListTab);
    }
    const toastType = searchParams.get("toast");
    if (toastType === "approved") setToast({ msg: "Sample Order approved successfully.", type: "success" });
    if (toastType === "rejected") setToast({ msg: "Sample Order rejected successfully.", type: "success" });
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const kpi = {
    total: allCountData?.total ?? 0,
    confirmed: confirmedCountData?.total ?? 0,
    dispatched: dispatchedCountData?.total ?? 0,
    delivered: deliveredCountData?.total ?? 0,
    totalValue: 0,
  };

  const tabCounts = useMemo(() => {
    return {
      all: allCountData?.total ?? 0,
      draft: draftCountData?.total ?? 0,
      pending_approval: approvalCountData?.total ?? 0,
      rejected: rejectedCountData?.total ?? 0,
      sales_return: isMounted ? getSampleReturnRecords().length : 0,
    };
  }, [allCountData, draftCountData, approvalCountData, rejectedCountData, isMounted]);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as OrderListTab);
    setPage(1);
    router.replace(`/sales/sample-order?tab=${tab}`, { scroll: false });
  };

  const isApprovalTab = activeTab === "pending_approval";

  const soNumberOptions = useMemo(() => {
    return (orderNoFilterRaw || []).map((item: any) => ({
      label: item.order_no,
      value: item.order_no,
    }));
  }, [orderNoFilterRaw]);

  const recipientOptions = useMemo(() => {
    return (salespersonFilterRaw || []).map((item: any) => ({
      label: item.salesperson__username,
      value: item.salesperson__username,
    }));
  }, [salespersonFilterRaw]);

  const territoryOptions = useMemo(() => {
    return Array.from(new Set(ordersList.map((o) => o.territory)))
      .filter(Boolean)
      .map((t) => ({ label: t, value: t }));
  }, [ordersList]);

  const columns: ColumnConfig<SalesOrder>[] = [
    {
      key: "soNumber",
      header: "Sample Order No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: soNumberOptions,
      render: (val, row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-brand-700">{row.soNumber}</span>

        </div>
      )
    },
    {
      key: "customerName",
      header: "Salesperson",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: recipientOptions,
      render: (val, row) => (
        <div>
          <p className="text-xs font-semibold text-foreground">{getSampleOrderDisplayRecipient(row)}</p>
          <p className="text-[11px] text-muted-foreground">{row.salesManCode || row.issuedToEmployeeRole || row.customerCode}</p>
        </div>
      )
    },
    {
      key: "territory",
      header: "Territory",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: territoryOptions,
      render: (val, row) => (
        <span className="text-xs text-muted-foreground">{row.territory}</span>
      )
    },
    {
      key: "items",
      header: "Items",
      sortable: true,
      align: "center",
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.items}</span>
      )
    },
    {
      key: "totalAmount",
      header: "Amount",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">
          ₹{row.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: FILTER_STATUSES.map(s => ({ label: formatOrderStatus(s), value: s })),
      render: (val, row) => (
        <div>
          <StatusPill status={row.status} />
          {row.packingListNumber && <p className="text-[10px] text-muted-foreground mt-0.5">{row.packingListNumber}</p>}
        </div>
      )
    },
    {
      key: "orderDate",
      header: "Order Date",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs text-muted-foreground">{row.orderDate}</span>
      )
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (val, row) => {
        const hydrated = hydrateOrderLineItems(row);
        const editable = canEditOrder(hydrated);
        const cancellable = canCancelOrder(hydrated);
        const piAllowed = canDownloadPI(hydrated);
        const packingAllowed = canGeneratePackingList(hydrated);

        return isApprovalTab ? (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              title="View"
              onClick={() => router.push(`/sales/sample-order/${row.id}?from=approval`)}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
            >
              <Eye className="w-4 h-4 text-muted-foreground" />
            </button>
            {canApproveOrder(hydrated) && (
              <>
                <button
                  type="button"
                  title="Approve"
                  onClick={() => setApproveOrder(hydrated)}
                  className="p-1.5 hover:bg-emerald-50 rounded-md transition-colors"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                </button>
                <button
                  type="button"
                  title="Reject"
                  onClick={() => setRejectOrder(hydrated)}
                  className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </>
            )}
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-100 ">
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
                onClick={() => router.push(`/sales/sample-order/${row.id}`)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Eye className="w-3.5 h-3.5 mr-2" /> View
              </button>
              <button
                type="button"
                disabled={!editable}
                onClick={() => router.push(`/sales/sample-order/${row.id}/edit`)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                  !editable ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
                )}
              >
                <Edit className="w-3.5 h-3.5 mr-2" /> Edit
              </button>

              <button
                type="button"
                disabled={!piAllowed}
                onClick={() => downloadProformaInvoice(hydrated)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                  !piAllowed ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
                )}
              >
                <FileText className="w-3.5 h-3.5 mr-2" /> Sample Issue Note
              </button>
              <button
                type="button"
                disabled={!packingAllowed}
                onClick={() => router.push(`/sales/sample-order/${hydrated.id}/packing-list/new`)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                  !packingAllowed ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
                )}
              >
                <Package className="w-3.5 h-3.5 mr-2" /> Generate Packing List
              </button>
              <DropdownMenuSeparator />
              <button
                type="button"
                disabled={!cancellable}
                onClick={() => setCancelOrder(hydrated)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm text-red-600 hover:bg-red-50",
                  !cancellable && "text-muted-foreground/50 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Cancel Order
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  return (
    <ListingContainer
      title="Sample Orders"
      titleIcon={ShoppingBag}
      metrics={
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: kpi.total, icon: ShoppingBag, accent: true },
            { label: "Confirmed", value: kpi.confirmed, icon: CheckCircle2 },
            { label: "Dispatched", value: kpi.dispatched, icon: TrendingUp },
            { label: "Delivered", value: kpi.delivered, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-2 flex items-center gap-3">
              <div
                className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}
              >
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      }
      tabs={[
        { value: "all", label: `Sales (${tabCounts.all})` },
        { value: "draft", label: `Draft (${tabCounts.draft})` },
        { value: "pending_approval", label: `Approval (${tabCounts.pending_approval})` },
        { value: "rejected", label: `Rejected (${tabCounts.rejected})` },
        { value: "sales_return", label: `Sample Return (${tabCounts.sales_return})` },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {activeTab === "sales_return" ? (
        <SampleReturnTab />
      ) : (
        <div>
          <MasterListing<SalesOrder>
            columns={columns}
            data={ordersList}
            totalRecords={totalRecords}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            onFilterChange={setFilters}
            emptyMessage=""
            searchPlaceholder="Search sample orders, employees…"
            currentFilters={filters}
            currentSort={sort}
            onAdd={() => router.push("/sales/sample-order/add")}
            addLabel="New Sample Order"
            onExport={async () => {
              try {
                const csvData = await SampleOrderService.export({
                  search: filters.search as string,
                  ordering,
                  apiFilters,
                });
                const blob = new Blob([csvData], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `sample-orders_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                showToast("Exported sample orders successfully.");
              } catch {
                showToast("Failed to export sample orders.", "error");
              }
            }}
          />
        </div>
      )}

      <CancelOrderDialog
        order={cancelOrder}
        open={!!cancelOrder}
        onClose={() => setCancelOrder(null)}
        onConfirm={(reason) => {
          if (!cancelOrder) return;
          updateStatusMutation.mutate(
            { id: String(cancelOrder.id), status: "cancelled", remarks: reason },
            {
              onSuccess: () => {
                refetch();
                showToast("Sample Order cancelled successfully.");
              },
              onError: () => {
                showToast("Failed to cancel order.", "error");
              }
            }
          );
        }}
      />

      <ApproveOrderDialog
        order={approveOrder}
        open={!!approveOrder}
        onClose={() => setApproveOrder(null)}
        onConfirm={() => {
          if (!approveOrder) return;
          updateStatusMutation.mutate(
            { id: String(approveOrder.id), status: "approved" },
            {
              onSuccess: () => {
                refetch();
                showToast("Sample Order approved successfully.");
              },
              onError: () => {
                showToast("Failed to approve order.", "error");
              }
            }
          );
        }}
      />

      <RejectOrderDialog
        order={rejectOrder}
        open={!!rejectOrder}
        onClose={() => setRejectOrder(null)}
        onConfirm={(reason) => {
          if (!rejectOrder) return;
          updateStatusMutation.mutate(
            { id: String(rejectOrder.id), status: "rejected", remarks: reason },
            {
              onSuccess: () => {
                refetch();
                showToast("Sample Order rejected successfully.");
              },
              onError: () => {
                showToast("Failed to reject order.", "error");
              }
            }
          );
        }}
      />

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </ListingContainer>
  );
}



