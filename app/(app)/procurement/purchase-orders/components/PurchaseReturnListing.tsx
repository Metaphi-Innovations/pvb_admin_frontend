"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MasterListing } from "@/components/listing/MasterListing";
import {
  ColumnConfig,
  FilterState,
  SortState,
} from "@/components/listing/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit2, MoreVertical } from "lucide-react";
import { formatCurrency } from "@/lib/procurement/utils";
import { Toast } from "../../components/ProcurementUI";
import { ProcAvatar, HighlightText } from "../../design/proc-design";
import { useFlashToast } from "../../hooks/useFlashToast";
import { formatListingDate } from "../../components/listing/ListingCells";
import {
  PURCHASE_RETURN_STATUS_CFG,
  type PurchaseReturn,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import { purchaseReturnRoutes } from "@/app/(app)/procurement/purchase-returns/purchase-return-utils";
import {
  buildPurchaseReturnApiFilters,
  buildPurchaseReturnOrdering,
  usePurchaseReturnFilterDropdown,
  usePurchaseReturnList,
} from "@/hooks/procurement";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";

function StatusPill({ status }: { status: PurchaseReturn["status"] }) {
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
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({
    key: "returnDate",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useFlashToast(setToast);

  const apiFilters = useMemo(
    () => buildPurchaseReturnApiFilters(debouncedFilters),
    [debouncedFilters],
  );
  const ordering = useMemo(
    () => buildPurchaseReturnOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const listQuery = usePurchaseReturnList({
    page,
    pageSize,
    search: debouncedSearch,
    ordering,
    apiFilters,
  });

  const statusOptionsQuery = usePurchaseReturnFilterDropdown("status");
  const returnNoOptionsQuery = usePurchaseReturnFilterDropdown("return_no");
  const supplierOptionsQuery = usePurchaseReturnFilterDropdown(
    "supplier__supplier_name",
  );
  const poOptionsQuery = usePurchaseReturnFilterDropdown(
    "purchase_order__po_no",
  );
  const initiatedByOptionsQuery = usePurchaseReturnFilterDropdown(
    "created_by_user__username",
  );

  const statusOptions = useMemo(
    () => statusOptionsQuery.data ?? [],
    [statusOptionsQuery.data],
  );
  const returnNoOptions = useMemo(
    () => returnNoOptionsQuery.data ?? [],
    [returnNoOptionsQuery.data],
  );
  const supplierOptions = useMemo(
    () => supplierOptionsQuery.data ?? [],
    [supplierOptionsQuery.data],
  );
  const poOptions = useMemo(
    () => poOptionsQuery.data ?? [],
    [poOptionsQuery.data],
  );
  const initiatedByOptions = useMemo(
    () => initiatedByOptionsQuery.data ?? [],
    [initiatedByOptionsQuery.data],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [sort.key, sort.direction]);

  const records = listQuery.data?.items ?? [];
  const totalRecords = listQuery.data?.total ?? 0;

  const columns: ColumnConfig<PurchaseReturn>[] = useMemo(
    () => [
      {
        key: "returnNumber",
        header: "Return No.",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: returnNoOptions,
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => router.push(purchaseReturnRoutes.detail(row.id))}
            className="text-left"
          >
            <p className="font-semibold text-brand-700 text-xs hover:underline font-mono">
              <HighlightText
                text={row.returnNumber}
                query={(filters.search as string) || ""}
              />
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatListingDate(row.returnDate)}
            </p>
          </button>
        ),
      },
      {
        key: "poNumber",
        header: "PO No.",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: poOptions,
        render: (_val, row) => (
          <button
            type="button"
            onClick={() =>
              router.push(`/procurement/purchase-orders/${String(row.poId)}`)
            }
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
        filterable: true,
        filterType: "dropdown",
        filterOptions: supplierOptions,
        render: (_val, row) => (
          <span className="inline-flex items-center gap-2 text-xs font-medium">
            <ProcAvatar name={row.supplierName} />
            <HighlightText
              text={row.supplierName}
              query={(filters.search as string) || ""}
            />
          </span>
        ),
      },
      {
        key: "totalItems",
        header: "Items",
        sortable: true,
        render: (_val, row) => (
          <span className="text-xs tabular-nums">{row.totalItems}</span>
        ),
      },
      // {
      //   key: "totalReturnQty",
      //   header: "Return Qty",
      //   sortable: true,
      //   render: (_val, row) => (
      //     <span className="text-xs tabular-nums font-semibold">{row.totalReturnQty}</span>
      //   ),
      // },
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
        filterOptions: statusOptions,
        render: (_val, row) => <StatusPill status={row.status} />,
      },
      {
        key: "initiatedBy",
        header: "Initiated By",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: initiatedByOptions,
        render: (_val, row) => (
          <span className="text-xs text-muted-foreground">
            {row.initiatedBy}
          </span>
        ),
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
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      router,
      filters.search,
      statusOptions,
      returnNoOptions,
      supplierOptions,
      poOptions,
      initiatedByOptions,
    ],
  );

  return (
    <>
      <MasterListing<PurchaseReturn>
        columns={columns}
        data={records}
        totalRecords={totalRecords}
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
        loading={listQuery.isFetching}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
