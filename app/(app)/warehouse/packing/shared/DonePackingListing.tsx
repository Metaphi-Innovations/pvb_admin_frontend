"use client";

import React, { useMemo, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { PackingRecord } from "../types";
import Link from "next/link";
import {
  CUSTOMER_OPTIONS,
  PACKED_BY_OPTIONS,
  DONE_STATUS_OPTIONS,
  STATUS_BADGE_CONFIG,
} from "../constants";
import {
  resolveWarehouseOrderType,
  matchesOrderTypeFilter,
  ORDER_TYPE_BADGE_CONFIG,
  formatWarehouseOrderAmount,
  type OrderTypeFilterTab,
} from "@/app/(app)/warehouse/lib/order-document-type";
import { getPackingListOrderNoHeader } from "../lib/packing-document-labels";

type PackingSourceTab = Exclude<OrderTypeFilterTab, "all">;

interface DonePackingListingProps {
  packingsForWarehouse: PackingRecord[];
  sourceFilter: PackingSourceTab;
}

function OrderTypeBadge({ row }: { row: PackingRecord }) {
  const type = resolveWarehouseOrderType(row);
  const cfg = ORDER_TYPE_BADGE_CONFIG[type];
  return (
    <span
      className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  );
}

function doneStatusLabel(row: PackingRecord): string {
  const type = resolveWarehouseOrderType(row);
  if (type === "sample_order" && row.status === "Packed") {
    return "Packed";
  }
  return row.status;
}

export function DonePackingListing({ packingsForWarehouse, sourceFilter }: DonePackingListingProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    setPage(1);
  }, [sourceFilter]);

  const filteredPackings = useMemo(() => {
    return packingsForWarehouse.filter((item) => {
      const type = resolveWarehouseOrderType(item);
      return matchesOrderTypeFilter(type, sourceFilter);
    });
  }, [packingsForWarehouse, sourceFilter]);

  const processed = useMemo(() => {
    let result = [...filteredPackings];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (item) =>
            item.packingNo.toLowerCase().includes(q) ||
            item.salesOrderNo.toLowerCase().includes(q) ||
            item.customer.toLowerCase().includes(q) ||
            (item.sourceDocumentNo && item.sourceDocumentNo.toLowerCase().includes(q)) ||
            (item.packingListNo && item.packingListNo.toLowerCase().includes(q)),
        );
      } else if (key === "packingNo" || key === "salesOrderNo" || key === "packingListNo") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (item) =>
            String(item.packingNo).toLowerCase().includes(q) ||
            String(item.salesOrderNo).toLowerCase().includes(q) ||
            (item.packingListNo && item.packingListNo.toLowerCase().includes(q)),
        );
      } else if (key === "customer" || key === "packedBy" || key === "status") {
        const selected = val as string[];
        result = result.filter((item) =>
          selected.includes(String(item[key as keyof PackingRecord])),
        );
      } else if (key === "packingDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter((item) => item.packingDate >= range.fromDate);
        if (range.toDate) result = result.filter((item) => item.packingDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (sort.key === "totalItems" || sort.key === "packedQuantity") {
          return sort.direction === "asc"
            ? (a[sort.key as keyof PackingRecord] as number) -
                (b[sort.key as keyof PackingRecord] as number)
            : (b[sort.key as keyof PackingRecord] as number) -
                (a[sort.key as keyof PackingRecord] as number);
        }
        const valA = String(a[sort.key as keyof PackingRecord] || "");
        const valB = String(b[sort.key as keyof PackingRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [filteredPackings, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  const isPurchaseReturn = sourceFilter === "purchase_return";

  const partyHeader =
    sourceFilter === "sample"
      ? "Issued To Employee"
      : sourceFilter === "stock_transfer"
        ? "Target Warehouse"
        : sourceFilter === "purchase_return"
          ? "Supplier"
          : "Customer";

  const columns = useMemo(() => {
    const cols: ColumnConfig<PackingRecord>[] = [
      {
        key: "orderType",
        header: "Order Type",
        width: "100px",
        render: (_: unknown, row: PackingRecord) => <OrderTypeBadge row={row} />,
      },
      {
        key: "salesOrderNo",
        header: getPackingListOrderNoHeader(sourceFilter),
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (_: unknown, row: PackingRecord) => (
          <Link
            href={`/warehouse/packing/view/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.salesOrderNo}
          </Link>
        ),
      },
    ];

    if (isPurchaseReturn) {
      cols.push({
        key: "poNumber",
        header: "PO No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "130px",
        render: (_: unknown, row: PackingRecord) => (
          <span className="font-mono text-xs font-semibold text-navy-700">{row.poNumber ?? "—"}</span>
        ),
      });
    }

    cols.push(
      {
        key: "customer",
        header: partyHeader,
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: CUSTOMER_OPTIONS,
        width: "180px",
        render: (_: unknown, row: PackingRecord) => {
          const type = resolveWarehouseOrderType(row);
          const label =
            type === "stock_transfer"
              ? row.targetWarehouse || row.customer
              : row.customer;
          return (
            <div className="min-w-0">
              <span className="text-xs text-foreground font-semibold block truncate">{label}</span>
              {isPurchaseReturn && row.supplierCode && (
                <span className="text-[11px] text-muted-foreground font-mono">{row.supplierCode}</span>
              )}
            </div>
          );
        },
      },
      {
        key: "sourceWarehouse",
        header: "Source Warehouse",
        sortable: true,
        width: "160px",
        render: (_: unknown, row: PackingRecord) => (
          <span className="text-xs text-foreground">
            {row.sourceWarehouse || row.warehouse}
          </span>
        ),
      },
      {
        key: "totalItems",
        header: "Items",
        sortable: true,
        align: "right",
        width: "80px",
        render: (val: unknown) => (
          <span className="font-mono text-xs tabular-nums">{val as number}</span>
        ),
      },
      {
        key: "packedQuantity",
        header: "Packed Qty",
        sortable: true,
        align: "right",
        width: "100px",
        render: (val: unknown) => (
          <span className="font-mono text-xs tabular-nums">{val as number}</span>
        ),
      },
      {
        key: "orderAmount",
        header: "Amount",
        align: "right",
        width: "90px",
        render: (_: unknown, row: PackingRecord) => {
          const type = resolveWarehouseOrderType(row);
          if (type === "sample_order") {
            return (
              <span className="font-mono text-xs tabular-nums">
                {formatWarehouseOrderAmount(type, 0)}
              </span>
            );
          }
          if (type === "purchase_return" && row.orderAmount != null) {
            return (
              <span className="font-mono text-xs tabular-nums">
                {formatWarehouseOrderAmount(type, row.orderAmount)}
              </span>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
      {
        key: "packedBy",
        header: "Packed By",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: PACKED_BY_OPTIONS,
        width: "120px",
      },
      {
        key: "packingDate",
        header: "Packing Date",
        sortable: true,
        width: "120px",
        render: (val: unknown) => (
          <span className="text-xs text-muted-foreground">{val as string}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: DONE_STATUS_OPTIONS,
        width: "110px",
        render: (_: unknown, row: PackingRecord) => {
          const label = doneStatusLabel(row);
          const cfg = STATUS_BADGE_CONFIG[label] || {
            bg: "bg-slate-100 text-slate-700 border-slate-200",
            label,
          };
          return (
            <span
              className={`inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${cfg.bg}`}
            >
              {cfg.label}
            </span>
          );
        },
      },
    );
    return cols;
  }, [partyHeader, isPurchaseReturn, sourceFilter]);

  const actions: ActionItemConfig<PackingRecord>[] = [
    {
      label: "View Details",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
    {
      label: "Create Dispatch",
      action: "dispatch",
      icon: Truck,
      hide: (row) => row.status !== "Packed",
      onClick: (row) => router.push(`/warehouse/dispatch/create?packingId=${row.id}`),
    },
  ];

  return (
    <MasterListing<PackingRecord>
        columns={columns}
        data={paginated}
        totalRecords={processed.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        actions={actions}
        emptyMessage=""
        searchPlaceholder="Search packing no, order no..."
      />
  );
}
