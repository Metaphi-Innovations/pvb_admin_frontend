"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit2, Package, MoreVertical } from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { Toast } from "../../components/ProcurementUI";
import { ProcAvatar, HighlightText } from "../../design/proc-design";
import { useFlashToast } from "../../hooks/useFlashToast";
import { applySearch, sortRows, type SortDir } from "../../hooks/useListingFilters";
import { formatListingDate } from "../../components/listing/ListingCells";
import {
  issuePurchaseReturnForPacking,
  loadPurchaseReturns,
  PURCHASE_RETURN_STATUS_CFG,
  type PurchaseReturn,
  type PurchaseReturnStatus,
} from "../../purchase-returns/purchase-return-data";
import { IssuePackingConfirmModal } from "./IssuePackingConfirmModal";
import {
  canIssuePurchaseReturnForPacking,
  purchaseReturnRoutes,
  validateReturnItems,
} from "../../purchase-returns/purchase-return-utils";

function StatusPill({ status }: { status: PurchaseReturnStatus }) {
  const cfg = PURCHASE_RETURN_STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function PurchaseReturnListing() {
  const router = useRouter();
  const [records, setRecords] = useState<PurchaseReturn[]>(() => loadPurchaseReturns());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "returnDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [packingTarget, setPackingTarget] = useState<PurchaseReturn | null>(null);
  const [packingConfirmOpen, setPackingConfirmOpen] = useState(false);

  useFlashToast(setToast);

  const refresh = () => setRecords(loadPurchaseReturns());

  const filtered = useMemo(() => {
    let r = [...records];

    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;
      if (key === "search") {
        r = applySearch(r, val as string, (x) => [
          x.returnNumber,
          x.poNumber,
          x.supplierName,
          x.initiatedBy,
        ]);
      } else if (key === "status") {
        const selected = val as string[];
        if (selected.length) r = r.filter((x) => selected.includes(x.status));
      } else if (key === "returnDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) r = r.filter((x) => x.returnDate >= range.fromDate);
        if (range.toDate) r = r.filter((x) => x.returnDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      r = sortRows(r, sort.key, sort.direction as SortDir, {
        returnNumber: (x) => x.returnNumber,
        returnDate: (x) => x.returnDate,
        poNumber: (x) => x.poNumber,
        supplierName: (x) => x.supplierName,
        totalItems: (x) => x.totalItems,
        totalReturnQty: (x) => x.totalReturnQty,
        grandTotal: (x) => x.summary?.grandTotal ?? 0,
        status: (x) => x.status,
        initiatedBy: (x) => x.initiatedBy,
      });
    }

    return r;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleIssueForPacking = (row: PurchaseReturn) => {
    const e = validateReturnItems(row.items);
    if (Object.keys(e).length > 0) {
      setToast({ msg: e._form ?? "Complete return lines before issuing for packing.", type: "error" });
      return;
    }
    setPackingTarget(row);
    setPackingConfirmOpen(true);
  };

  const confirmIssueForPacking = () => {
    if (!packingTarget) return;
    issuePurchaseReturnForPacking(packingTarget);
    refresh();
    setToast({ msg: `${packingTarget.returnNumber} issued for packing.`, type: "success" });
    setPackingTarget(null);
  };

  const columns: ColumnConfig<PurchaseReturn>[] = [
    {
      key: "returnNumber",
      header: "Return No.",
      sortable: true,
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => router.push(purchaseReturnRoutes.detail(row.id))}
          className="text-left"
        >
          <p className="font-semibold text-brand-700 text-xs hover:underline font-mono">
            <HighlightText text={row.returnNumber} query={(filters.search as string) || ""} />
          </p>
          <p className="text-[11px] text-muted-foreground">{formatListingDate(row.returnDate)}</p>
        </button>
      ),
    },
    {
      key: "poNumber",
      header: "PO No.",
      sortable: true,
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => router.push(`/procurement/purchase-orders/${row.poId}`)}
          className="font-mono text-xs text-brand-700 hover:underline"
        >
          {row.poNumber}
        </button>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier",
      sortable: true,
      render: (_val, row) => (
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <ProcAvatar name={row.supplierName} />
          <HighlightText text={row.supplierName} query={(filters.search as string) || ""} />
        </span>
      ),
    },
    {
      key: "totalItems",
      header: "Items",
      sortable: true,
      render: (_val, row) => <span className="text-xs tabular-nums">{row.totalItems}</span>,
    },
    {
      key: "totalReturnQty",
      header: "Return Qty",
      sortable: true,
      render: (_val, row) => (
        <span className="text-xs tabular-nums font-semibold">{row.totalReturnQty}</span>
      ),
    },
    {
      key: "grandTotal",
      header: "Amount",
      sortable: true,
      render: (_val, row) => (
        <span className="text-xs font-semibold tabular-nums">
          {formatCurrency(row.summary?.grandTotal ?? 0)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "Approved", value: "approved" },
        { label: "Issued for Packing", value: "issued_for_packing" },
        { label: "Returned", value: "returned" },
      ],
      render: (_val, row) => <StatusPill status={row.status} />,
    },
    {
      key: "initiatedBy",
      header: "Initiated By",
      sortable: true,
      render: (_val, row) => <span className="text-xs text-muted-foreground">{row.initiatedBy}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (_val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 z-[200]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => router.push(purchaseReturnRoutes.detail(row.id))}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 rounded-sm"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            <button
              type="button"
              onClick={() => router.push(purchaseReturnRoutes.edit(row.id))}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 rounded-sm"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            {canIssuePurchaseReturnForPacking(row) && (
              <button
                type="button"
                onClick={() => handleIssueForPacking(row)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 rounded-sm"
              >
                <Package className="w-3.5 h-3.5" /> Issue for Packing
              </button>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <MasterListing<PurchaseReturn>
        columns={columns}
        data={paginated}
        totalRecords={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        emptyMessage="purchase returns"
        searchPlaceholder="Search return no., PO no., supplier…"
        currentFilters={filters}
        currentSort={sort}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <IssuePackingConfirmModal
        open={packingConfirmOpen}
        onOpenChange={(open) => {
          setPackingConfirmOpen(open);
          if (!open) setPackingTarget(null);
        }}
        record={packingTarget}
        onConfirm={confirmIssueForPacking}
      />
    </>
  );
}
