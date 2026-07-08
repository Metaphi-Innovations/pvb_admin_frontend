"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
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
  Split,
  FileText,
  Package,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import type { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import CancelOrderDialog from "./components/CancelOrderDialog";
import { SalesReturnTab } from "./components/SalesReturnTab";
import { getSalesReturnRecords } from "./sales-return-data";
import { downloadProformaInvoice } from "./pi-document";
import {
  type SalesOrder,
  type OrderStatus,
  formatOrderStatus,
  canEditOrder,
  canSplitOrder,
  canCancelOrder,
  canDownloadPI,
  canGeneratePackingList,
  hydrateOrderLineItems,
} from "./orders-data";
import { useSalesOrders, useCancelSalesOrder, useSalesOrderFilterOptions } from "@/hooks/sales/use-sales-orders";
import { SalesOrderService } from "@/services/sales-order.service";

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ready_for_packing: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  packed: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  dispatched: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  delivered: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
};

const STATUS_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Ready For Packing", value: "READY_FOR_PACKING" },
  { label: "Packed", value: "PACKED" },
  { label: "Dispatched", value: "DISPATCHED" },
  { label: "Delivered", value: "DELIVERED" },
];

type OrderListTab = "all" | "draft" | "pending_approval" | "rejected" | "sales_return";

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status.toLowerCase()] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {formatOrderStatus(status as OrderStatus)}
    </span>
  );
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<OrderListTab>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "orderDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [salesReturnCount, setSalesReturnCount] = useState(0);
  const [cancelOrder, setCancelOrder] = useState<SalesOrder | null>(null);

  const { data: customerFilterRaw } = useSalesOrderFilterOptions("customer__customer_name", activeTab);
  const { data: soNumberFilterRaw } = useSalesOrderFilterOptions("so_number", activeTab);

  const customerOptions = useMemo(() => {
    return (customerFilterRaw || []).map((item: any) => ({
      label: item.customer__customer_name,
      value: item.customer__customer_name,
    }));
  }, [customerFilterRaw]);

  const soNumberOptions = useMemo(() => {
    return (soNumberFilterRaw || []).map((item: any) => ({
      label: item.so_number,
      value: item.so_number,
    }));
  }, [soNumberFilterRaw]);

  useEffect(() => {
    setSalesReturnCount(getSalesReturnRecords().length);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "all" || tab === "draft" || tab === "pending_approval" || tab === "rejected" || tab === "sales_return") {
      setActiveTab(tab as OrderListTab);
    }
    const toastType = searchParams.get("toast");
    if (toastType === "approved") setToast({ msg: "Sales order approved successfully.", type: "success" });
    if (toastType === "rejected") setToast({ msg: "Sales order rejected successfully.", type: "success" });
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters, pageSize]);

  // Construct ordering query param
  const ordering = useMemo(() => {
    if (!sort.key || sort.direction === "none") return undefined;
    const fieldMap: Record<string, string> = {
      soNumber: "so_number",
      customerName: "customer__customer_name",
      status: "status",
      orderDate: "order_date",
      totalAmount: "grand_total",
    };
    const backendKey = fieldMap[sort.key] || sort.key;
    return sort.direction === "desc" ? `-${backendKey}` : backendKey;
  }, [sort]);

  // Construct filters payload
  const apiFilters = useMemo(() => {
    const backendFilters: Record<string, any> = {};
    if (activeTab && activeTab !== "all" && activeTab !== "sales_return") {
      backendFilters.status = activeTab.toUpperCase();
    }

    if (filters.soNumber && Array.isArray(filters.soNumber) && filters.soNumber.length > 0) {
      backendFilters.so_number = filters.soNumber[0];
    } else if (filters.soNumber && typeof filters.soNumber === "string") {
      backendFilters.so_number = filters.soNumber;
    }

    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      backendFilters.status = filters.status[0].toUpperCase();
    }

    if (filters.customerName && Array.isArray(filters.customerName) && filters.customerName.length > 0) {
      backendFilters.customer = { customer_name: filters.customerName[0] };
    }

    if (filters.orderDate && typeof filters.orderDate === "object") {
      const range = filters.orderDate as { fromDate?: string; toDate?: string };
      if (range.fromDate || range.toDate) {
        backendFilters.range = {
          order_date: {
            from: range.fromDate || undefined,
            to: range.toDate || undefined,
          }
        };
      }
    }

    return backendFilters;
  }, [activeTab, filters]);

  const searchVal = (filters.search as string) || "";

  // Call the useSalesOrders Query hook
  const { data: salesOrdersData, isLoading, refetch } = useSalesOrders({
    page,
    pageSize,
    search: searchVal,
    ordering,
    apiFilters,
  });

  const orders = salesOrdersData?.items ?? [];
  const totalRecords = salesOrdersData?.total ?? 0;

  // Auxiliary queries to fetch counts for all other tabs
  const { data: allCountData } = useSalesOrders({
    page: 1,
    pageSize: 1,
    apiFilters: {},
  });
  const { data: draftCountData } = useSalesOrders({
    page: 1,
    pageSize: 1,
    apiFilters: { status: "DRAFT" },
  });
  const { data: approvalCountData } = useSalesOrders({
    page: 1,
    pageSize: 1,
    apiFilters: { status: "PENDING_APPROVAL" },
  });
  const { data: rejectedCountData } = useSalesOrders({
    page: 1,
    pageSize: 1,
    apiFilters: { status: "REJECTED" },
  });

  const allCount = allCountData?.total ?? 0;
  const draftCount = draftCountData?.total ?? 0;
  const approvalCount = approvalCountData?.total ?? 0;
  const rejectedCount = rejectedCountData?.total ?? 0;

  const cancelMutation = useCancelSalesOrder();

  const handleCancelSuccess = () => {
    refetch();
    setCancelOrder(null);
    setToast({ msg: "Sales order cancelled successfully.", type: "success" });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as OrderListTab);
    setPage(1);
    router.replace(`/sales/orders?tab=${tab}`, { scroll: false });
  };

  const isApprovalTab = activeTab === "pending_approval";

  const columns: ColumnConfig<SalesOrder>[] = [
    {
      key: "soNumber",
      header: "SO Number",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: soNumberOptions,
      render: (val, row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-brand-700">{row.soNumber}</span>
          {row.parentOrderNumber && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Split from {row.parentOrderNumber}</p>
          )}
        </div>
      )
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: customerOptions,
      render: (val, row) => (
        <div>
          <p className="text-xs font-semibold text-foreground">{row.customerName}</p>
          <p className="text-[11px] text-muted-foreground">{row.customerCode}</p>
        </div>
      )
    },
    {
      key: "territory",
      header: "Territory",
      sortable: true,
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
        <span className="text-xs font-semibold text-foreground">₹{row.totalAmount.toLocaleString()}</span>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: STATUS_OPTIONS,
      render: (val, row) => (
        <div>
          <StatusPill status={row.status} />
        </div>
      )
    },
    {
      key: "orderDate",
      header: "Order Date",
      sortable: true,
      filterable: true,
      filterType: "date",
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
        const splittable = canSplitOrder(hydrated);
        const cancellable = canCancelOrder(hydrated);
        const piAllowed = canDownloadPI(hydrated);
        const packingAllowed = canGeneratePackingList(hydrated);

        return isApprovalTab ? (
          <button
            type="button"
            title="View"
            onClick={() => router.push(`/sales/orders/${row.id}?from=approval`)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
          </button>
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
                onClick={() => router.push(`/sales/orders/${row.id}`)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Eye className="w-3.5 h-3.5 mr-2" /> View
              </button>
              <button
                type="button"
                disabled={!editable}
                onClick={() => router.push(`/sales/orders/${row.id}/edit`)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                  !editable ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
                )}
              >
                <Edit className="w-3.5 h-3.5 mr-2" /> Edit
              </button>
              <button
                type="button"
                disabled={!splittable}
                onClick={() => router.push(`/sales/orders/${row.id}/split`)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                  !splittable ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
                )}
              >
                <Split className="w-3.5 h-3.5 mr-2" /> Split Order
              </button>
              <button
                type="button"
                disabled={!piAllowed}
                onClick={async () => {
                  try {
                    await SalesOrderService.downloadPI(row.id);
                    setToast({ msg: "Proforma Invoice downloaded successfully.", type: "success" });
                  } catch (e) {
                    console.error("PI download error", e);
                    setToast({ msg: "Failed to download Proforma Invoice.", type: "error" });
                  }
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                  !piAllowed ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
                )}
              >
                <FileText className="w-3.5 h-3.5 mr-2" /> Download PI
              </button>
              <button
                type="button"
                disabled={!packingAllowed}
                onClick={() => router.push(`/sales/orders/${hydrated.id}/packing-list/new`)}
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
      title="Sales Orders"
      titleIcon={ShoppingBag}
      metrics={
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: totalRecords, icon: ShoppingBag, accent: true },
            { label: "Confirmed", value: orders.filter((o) => o.status === "confirmed").length, icon: CheckCircle2 },
            { label: "Dispatched", value: orders.filter((o) => o.status === "dispatched").length, icon: TrendingUp },
            { label: "Delivered", value: orders.filter((o) => o.status === "delivered").length, icon: CheckCircle2 },
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
        { value: "all", label: `Sales (${allCount})` },
        { value: "draft", label: `Draft (${draftCount})` },
        { value: "pending_approval", label: `Approval (${approvalCount})` },
        { value: "rejected", label: `Rejected (${rejectedCount})` },
        { value: "sales_return", label: `Sales Return (${salesReturnCount})` },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {activeTab === "sales_return" ? (
        <SalesReturnTab onCountChange={setSalesReturnCount} />
      ) : (
        <div>
          <MasterListing<SalesOrder>
            columns={columns}
            data={orders}
            totalRecords={totalRecords}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            onFilterChange={setFilters}
            emptyMessage=""
            searchPlaceholder="Search orders, customers…"
            currentFilters={filters}
            currentSort={sort}
            onAdd={() => router.push("/sales/orders/add")}
            addLabel="New Order"
            loading={isLoading}
            onExport={async () => {
              try {
                await SalesOrderService.export({
                  search: searchVal,
                  ordering,
                  apiFilters,
                });
                setToast({ msg: "Export downloaded successfully.", type: "success" });
              } catch (e) {
                console.error("Export error", e);
                setToast({ msg: "Failed to export sales orders.", type: "error" });
              }
            }}
          />
        </div>
      )}

      {cancelOrder && (
        <CancelOrderDialog
          order={cancelOrder}
          open={!!cancelOrder}
          onClose={() => setCancelOrder(null)}
          onSuccess={handleCancelSuccess}
        />
      )}

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
