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
  loadTransfers,
  formatTransferStatus,
  canEditTransfer,
  canCancelTransfer,
  canDownloadNote,
  canGeneratePackingList,
  approveStockTransfer,
  rejectStockTransfer,
} from "./stock-transfer-data";
import { downloadTransferNote, printTransferPackingList } from "./transfer-note-document";
import TransferPackingListDialog from "./components/TransferPackingListDialog";
import CancelTransferDialog from "./components/CancelTransferDialog";

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
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
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "transferDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [packingTransfer, setPackingTransfer] = useState<StockTransfer | null>(null);
  const [cancelTransfer, setCancelTransfer] = useState<StockTransfer | null>(null);

  const refreshTransfers = () => setTransfers(loadTransfers());

  useEffect(() => {
    refreshTransfers();
  }, []);

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

  const filtered = useMemo(() => {
    let d = transfers;
    if (activeTab !== "all") {
      d = d.filter((t) => t.status === activeTab);
    }

    const searchVal = filters.search as string;
    if (searchVal?.trim()) {
      const q = searchVal.toLowerCase();
      d = d.filter(
        (t) =>
          t.transferNumber.toLowerCase().includes(q) ||
          t.sourceWarehouseName.toLowerCase().includes(q) ||
          t.targetWarehouseName.toLowerCase().includes(q) ||
          t.createdBy.toLowerCase().includes(q)
      );
    }

    const numberVal = filters.transferNumber as string;
    if (numberVal?.trim()) {
      d = d.filter((t) => t.transferNumber.toLowerCase().includes(numberVal.toLowerCase()));
    }

    const sourceVal = filters.sourceWarehouseName as string[];
    if (sourceVal && sourceVal.length > 0) {
      d = d.filter((t) => sourceVal.includes(t.sourceWarehouseName));
    }

    const targetVal = filters.targetWarehouseName as string[];
    if (targetVal && targetVal.length > 0) {
      d = d.filter((t) => targetVal.includes(t.targetWarehouseName));
    }

    const statusVal = filters.status as string[];
    if (statusVal && statusVal.length > 0) {
      d = d.filter((t) => statusVal.includes(t.status));
    }

    if (sort.key && sort.direction !== "none") {
      d = [...d].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sort.key];
        const bv = (b as unknown as Record<string, unknown>)[sort.key];
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }
    return d;
  }, [transfers, activeTab, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const kpi = {
    total: transfers.length,
    draft: transfers.filter((t) => t.status === "draft").length,
    pending: transfers.filter((t) => t.status === "pending").length,
    approved: transfers.filter((t) => t.status === "approved").length,
    rejected: transfers.filter((t) => t.status === "rejected").length,
    cancelled: transfers.filter((t) => t.status === "cancelled").length,
    totalAmount: transfers.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
    totalQuantity: transfers.reduce((sum, t) => sum + (t.totalQuantity || 0), 0),
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
    router.replace(`/sales/stock-transfer?tab=${tab}`, { scroll: false });
  };

  const sourceWarehouseOptions = useMemo(() => {
    return Array.from(new Set(transfers.map((t) => t.sourceWarehouseName)))
      .filter(Boolean)
      .map((name) => ({ label: name, value: name }));
  }, [transfers]);

  const targetWarehouseOptions = useMemo(() => {
    return Array.from(new Set(transfers.map((t) => t.targetWarehouseName)))
      .filter(Boolean)
      .map((name) => ({ label: name, value: name }));
  }, [transfers]);
  const handleCancelSuccess = (updatedTransfer: StockTransfer) => {
    setTransfers((prev) => prev.map((t) => (t.id === updatedTransfer.id ? updatedTransfer : t)));
    setToast({ msg: "Stock transfer cancelled successfully.", type: "success" });
  };

  const handleApprove = (id: number) => {
    const res = approveStockTransfer(id);
    if ("error" in res) {
      setToast({ msg: res.error, type: "error" });
    } else {
      setToast({ msg: "Stock transfer approved successfully.", type: "success" });
      refreshTransfers();
    }
  };

  const handleReject = (id: number) => {
    const res = rejectStockTransfer(id);
    if ("error" in res) {
      setToast({ msg: res.error, type: "error" });
    } else {
      setToast({ msg: "Stock transfer rejected successfully.", type: "success" });
      refreshTransfers();
    }
  };



  const columns: ColumnConfig<StockTransfer>[] = [
    {
      key: "transferNumber",
      header: "Transfer No.",
      sortable: true,
      filterable: true,
      filterType: "text",
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
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Draft", value: "draft" },
        { label: "Pending Approval", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Cancelled", value: "cancelled" },
      ],
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
              onClick={() => downloadTransferNote(row)}
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
              onClick={() => setPackingTransfer(row)}
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
        { value: "rejected", label: `Rejected (${kpi.rejected})` },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div>
        <MasterListing<StockTransfer>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          emptyMessage="transfers"
          searchPlaceholder="Search transfers, warehouses…"
          currentFilters={filters}
          currentSort={sort}
          onAdd={() => router.push("/sales/stock-transfer/new")}
          addLabel="New Transfer"
          onExport={() => console.log("Exporting stock transfers...")}
        />
      </div>

      <TransferPackingListDialog
        transfer={packingTransfer}
        open={!!packingTransfer}
        onClose={() => setPackingTransfer(null)}
        onSuccess={(updatedTransfer, list) => {
          refreshTransfers();
          setPackingTransfer(null);
          setToast({ msg: `Packing list ${list.packingListNumber} generated for ${updatedTransfer.transferNumber}.`, type: "success" });
        }}
      />

      <CancelTransferDialog
        transfer={cancelTransfer}
        open={!!cancelTransfer}
        onClose={() => setCancelTransfer(null)}
        onSuccess={(updatedTransfer) => {
          handleCancelSuccess(updatedTransfer);
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








