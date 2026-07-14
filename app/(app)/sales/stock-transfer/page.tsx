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
  Plus,
  MoreVertical,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Search,
  ArrowLeftRight,
  Clock,
  XCircle,
  FileText,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import type { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import {
  type StockTransfer,
  type TransferStatus,
  formatTransferStatus,
  canEditTransfer,
  canCancelTransfer,
  canDownloadNote,
  canGeneratePackingList,
} from "./stock-transfer-data";
import { printTransferPackingList } from "./transfer-note-document";
import CancelTransferDialog from "./components/CancelTransferDialog";
import {
  useStockTransfers,
  useCancelStockTransfer,
  useStockTransferFilterOptions,
  useStockTransferSummary,
} from "@/hooks/sales/use-stock-transfers";
import { StockTransferService } from "@/services/stock-transfer.service";

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending_packing: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  packing_in_progress: { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" },
  packed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  ready_to_dispatch: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  dispatched: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  in_transit: { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500" },
  grn_pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  partially_received: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  received: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  qc_pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  qc_passed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {formatTransferStatus(status as TransferStatus)}
    </span>
  );
}

export default function StockTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "transferDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [cancelTransfer, setCancelTransfer] = useState<StockTransfer | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
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
    const direction = sort.direction === "desc" ? "-" : "";
    const keyMap: Record<string, string> = {
      transferNumber: "transfer_no",
      transferDate: "transfer_date",
      sourceWarehouseName: "from_warehouse__warehouse_name",
      targetWarehouseName: "to_warehouse__warehouse_name",
      totalItems: "total_products",
      totalQuantity: "total_quantity",
      status: "status",
      createdBy: "created_at",
    };
    const key = keyMap[sort.key] || sort.key;
    return `${direction}${key}`;
  }, [sort]);

  // Construct filters payload
  const apiFilters = useMemo(() => {
    const f: Record<string, any> = {};
    if (activeTab && activeTab !== "all") {
      if (activeTab === "pending") {
        f.status = "SUBMITTED";
      } else if (activeTab === "approved") {
        f.status = "APPROVED";
      } else if (activeTab === "rejected") {
        f.status = "CANCELLED";
      } else {
        f.status = activeTab.toUpperCase();
      }
    }
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      f.status = filters.status.map(s => s === "pending" ? "SUBMITTED" : s === "approved" ? "APPROVED" : s.toUpperCase());
    }
    if (filters.sourceWarehouseName && Array.isArray(filters.sourceWarehouseName) && filters.sourceWarehouseName.length > 0) {
      f.from_warehouse = { warehouse_name: filters.sourceWarehouseName };
    }
    if (filters.targetWarehouseName && Array.isArray(filters.targetWarehouseName) && filters.targetWarehouseName.length > 0) {
      f.to_warehouse = { warehouse_name: filters.targetWarehouseName };
    }
    if (filters.transferNumber) {
      f.transfer_no = filters.transferNumber;
    }
    return f;
  }, [activeTab, filters]);

  const searchVal = (filters.search as string) || "";

  // Queries
  const { data: listData, isLoading, refetch } = useStockTransfers({
    page,
    pageSize,
    search: searchVal,
    ordering,
    apiFilters,
  });

  const transfers = listData?.items || [];
  const totalRecords = listData?.total || 0;



  // Summary/Counts Query
  const { data: summaryData } = useStockTransferSummary();

  const kpi = {
    total: summaryData?.total ?? 0,
    draft: summaryData?.draft ?? 0,
    pending: summaryData?.pending ?? 0,
    approved: summaryData?.approved ?? 0,
    rejected: summaryData?.rejected ?? 0,
  };

  const filterStatus = useMemo(() => {
    if (activeTab === "all") return undefined;
    if (activeTab === "draft") return "DRAFT";
    if (activeTab === "pending") return "SUBMITTED";
    if (activeTab === "approved") return "APPROVED";
    if (activeTab === "rejected") return "CANCELLED";
    return activeTab.toUpperCase();
  }, [activeTab]);

  const { data: sourceWhFilterRaw } = useStockTransferFilterOptions("from_warehouse__warehouse_name", filterStatus);
  const { data: targetWhFilterRaw } = useStockTransferFilterOptions("to_warehouse__warehouse_name", filterStatus);
  const { data: transferNoFilterRaw } = useStockTransferFilterOptions("transfer_no", filterStatus);
  const { data: statusFilterRaw } = useStockTransferFilterOptions("status", filterStatus);

  const sourceWarehouseOptions = useMemo(() => {
    return (sourceWhFilterRaw || []).map((item: any) => ({
      label: item.from_warehouse__warehouse_name,
      value: item.from_warehouse__warehouse_name,
    }));
  }, [sourceWhFilterRaw]);

  const targetWarehouseOptions = useMemo(() => {
    return (targetWhFilterRaw || []).map((item: any) => ({
      label: item.to_warehouse__warehouse_name,
      value: item.to_warehouse__warehouse_name,
    }));
  }, [targetWhFilterRaw]);

  const transferNoOptions = useMemo(() => {
    return (transferNoFilterRaw || []).map((item: any) => ({
      label: item.transfer_no,
      value: item.transfer_no,
    }));
  }, [transferNoFilterRaw]);

  const statusOptions = useMemo(() => {
    if (!statusFilterRaw || statusFilterRaw.length === 0) {
      return [
        { label: "Draft", value: "draft" },
        { label: "Pending Approval", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Cancelled", value: "cancelled" },
      ];
    }
    return statusFilterRaw.map((item: any) => ({
      label: formatTransferStatus(item.status as TransferStatus) || item.status,
      value: item.status,
    }));
  }, [statusFilterRaw]);

  const cancelMutation = useCancelStockTransfer();

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTransfer) return;
    await cancelMutation.mutateAsync({ id: cancelTransfer.id as any, remarks: reason });
    setToast({ msg: "Stock transfer cancelled successfully.", type: "success" });
    refetch();
  };

  const handleDownloadNote = async (row: StockTransfer) => {
    try {
      const blob = await StockTransferService.downloadNote(row.id as any);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-transfer-${row.transferNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToast({ msg: "Stock transfer note downloaded.", type: "success" });
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to download note.", type: "error" });
    }
  };

  const handleExport = async () => {
    try {
      const csvContent = await StockTransferService.export({
        search: searchVal,
        ordering,
        apiFilters,
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-transfers.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToast({ msg: "Export completed successfully.", type: "success" });
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to export data.", type: "error" });
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setFilters({});
    setPage(1);
    router.replace(`/sales/stock-transfer?tab=${tab}`, { scroll: false });
  };

  const columns: ColumnConfig<StockTransfer>[] = [
    {
      key: "transferNumber",
      header: "Transfer No.",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: transferNoOptions,
      render: (val, row) => (
        <span className="font-mono text-xs font-semibold text-brand-700">{row.transferNumber}</span>
      )
    },
    {
      key: "transferDate",
      header: "Transfer Date",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs text-muted-foreground">{row.transferDate}</span>
      )
    },
    {
      key: "sourceWarehouseName",
      header: "Source Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: sourceWarehouseOptions,
      render: (val, row) => (
        <div>
          <p className="text-xs font-semibold text-foreground">{row.sourceWarehouseName}</p>
          <p className="text-[11px] text-muted-foreground">{row.sourceWarehouseCode}</p>
        </div>
      )
    },
    {
      key: "targetWarehouseName",
      header: "Target Warehouse",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: targetWarehouseOptions,
      render: (val, row) => (
        <div>
          <p className="text-xs font-semibold text-foreground">{row.targetWarehouseName}</p>
          <p className="text-[11px] text-muted-foreground">{row.targetWarehouseCode}</p>
        </div>
      )
    },
    {
      key: "totalItems",
      header: "Total Items",
      sortable: true,
      align: "center",
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.totalItems}</span>
      )
    },
    {
      key: "totalQuantity",
      header: "Total Quantity",
      sortable: true,
      align: "center",
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.totalQuantity}</span>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: activeTab === "all",
      filterType: "dropdown",
      filterOptions: statusOptions,
      render: (val, row) => (
        <StatusPill status={row.status} />
      )
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs text-muted-foreground">{row.createdBy}</span>
      )
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
              onClick={() => router.push(`/sales/stock-transfer/${row.id}`)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
            >
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </button>
            {canEditTransfer(row) && (
              <button
                type="button"
                onClick={() => router.push(`/sales/stock-transfer/${row.id}/edit`)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
              >
                <Edit className="w-3.5 h-3.5 mr-2" /> Edit
              </button>
            )}
            <button
              type="button"
              disabled={!canDownloadNote(row)}
              onClick={() => handleDownloadNote(row)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                !canDownloadNote(row) ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
              )}
            >
              <FileText className="w-3.5 h-3.5 mr-2" /> Download Note
            </button>
            <button
              type="button"
              disabled={!canGeneratePackingList(row)}
              onClick={() => router.push(`/sales/stock-transfer/${row.id}/packing-list/new`)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 text-xs transition-colors rounded-sm",
                !canGeneratePackingList(row) ? "text-muted-foreground/50 cursor-not-allowed" : "text-foreground hover:bg-muted/60"
              )}
            >
              <Package className="w-3.5 h-3.5 mr-2" /> Generate Packing List
            </button>
            {canCancelTransfer(row) ? (
              <>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={() => setCancelTransfer(row)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Cancel Transfer
                </button>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <ListingContainer
      title="Stock Transfers"
      titleIcon={ArrowLeftRight}
      metrics={
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Transfers", value: kpi.total, icon: ArrowLeftRight, accent: true },
            { label: "Approved", value: kpi.approved, icon: CheckCircle2 },
            { label: "Pending", value: kpi.pending, icon: Clock },
            { label: "Draft", value: kpi.draft, icon: Clock },
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
        { value: "all", label: `All (${kpi.total})` },
        { value: "draft", label: `Draft (${kpi.draft})` },
        { value: "pending", label: `Pending (${kpi.pending})` },
        { value: "approved", label: `Approved (${kpi.approved})` },
        { value: "rejected", label: `Cancelled (${kpi.rejected})` },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div>
        <MasterListing<StockTransfer>
          columns={columns}
          data={transfers}
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          emptyMessage={isLoading ? "Loading transfers..." : "transfers"}
          searchPlaceholder="Search transfers, warehouses…"
          currentFilters={filters}
          currentSort={sort}
          onAdd={() => router.push("/sales/stock-transfer/new")}
          addLabel="New Transfer"
          onExport={handleExport}
        />
      </div>

      <CancelTransferDialog
        transfer={cancelTransfer}
        open={!!cancelTransfer}
        onClose={() => setCancelTransfer(null)}
        onConfirm={handleCancelConfirm}
        isLoading={cancelMutation.isPending}
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
