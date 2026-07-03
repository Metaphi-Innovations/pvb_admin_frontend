"use client";

import React, { useMemo, useState } from "react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { Eye, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { SalesOrderRecord } from "../types";
import Link from "next/link";
import {
  CUSTOMER_OPTIONS,
  READY_STATUS_OPTIONS,
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

interface ReadyPackingListingProps {
  ordersForWarehouse: SalesOrderRecord[];
  sourceFilter: PackingSourceTab;
}

function OrderTypeBadge({ row }: { row: SalesOrderRecord }) {
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

function readyStatusLabel(row: SalesOrderRecord): string {
  const type = resolveWarehouseOrderType(row);
  if (type === "sample_order" && row.status === "Ready For Packing") {
    return "Pending Packing";
  }
  return row.status;
}

export function ReadyPackingListing({ ordersForWarehouse, sourceFilter }: ReadyPackingListingProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    setPage(1);
  }, [sourceFilter]);

  const filteredOrders = useMemo(() => {
    return ordersForWarehouse.filter((item) => {
      const type = resolveWarehouseOrderType(item);
      return matchesOrderTypeFilter(type, sourceFilter);
    });
  }, [ordersForWarehouse, sourceFilter]);

  const processed = useMemo(() => {
    let result = [...filteredOrders];
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (!val) return;

      if (key === "search") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (item) =>
            item.salesOrderNo.toLowerCase().includes(q) ||
            item.customer.toLowerCase().includes(q) ||
            (item.sourceDocumentNo && item.sourceDocumentNo.toLowerCase().includes(q)) ||
            (item.packingListNo && item.packingListNo.toLowerCase().includes(q)),
        );
      } else if (key === "salesOrderNo" || key === "packingListNo") {
        const q = (val as string).toLowerCase();
        result = result.filter(
          (item) =>
            item.salesOrderNo.toLowerCase().includes(q) ||
            (item.packingListNo && item.packingListNo.toLowerCase().includes(q)),
        );
      } else if (key === "customer" || key === "status") {
        const selected = val as string[];
        result = result.filter((item) =>
          selected.includes(String(item[key as keyof SalesOrderRecord])),
        );
      } else if (key === "orderDate") {
        const range = val as { fromDate: string; toDate: string };
        if (range.fromDate) result = result.filter((item) => item.orderDate >= range.fromDate);
        if (range.toDate) result = result.filter((item) => item.orderDate <= range.toDate);
      }
    });

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        if (
          sort.key === "totalItems" ||
          sort.key === "totalQuantity" ||
          sort.key === "orderAmount"
        ) {
          return sort.direction === "asc"
            ? (a[sort.key as keyof SalesOrderRecord] as number) -
                (b[sort.key as keyof SalesOrderRecord] as number)
            : (b[sort.key as keyof SalesOrderRecord] as number) -
                (a[sort.key as keyof SalesOrderRecord] as number);
        }
        const valA = String(a[sort.key as keyof SalesOrderRecord] || "");
        const valB = String(b[sort.key as keyof SalesOrderRecord] || "");
        return sort.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return result;
  }, [filteredOrders, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize]);

  const columns = useMemo(() => {
    const isPurchaseReturn = sourceFilter === "purchase_return";

    const baseColumns: ColumnConfig<SalesOrderRecord>[] = [
      {
        key: "orderType",
        header: "Order Type",
        width: "100px",
        render: (_: unknown, row: SalesOrderRecord) => <OrderTypeBadge row={row} />,
      },
      {
        key: "salesOrderNo",
        header: getPackingListOrderNoHeader(sourceFilter),
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "140px",
        render: (_: unknown, row: SalesOrderRecord) => (
          <Link
            href={`/warehouse/packing/create/${row.id}`}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.salesOrderNo}
          </Link>
        ),
      },
    ];

    if (isPurchaseReturn) {
      baseColumns.push({
        key: "poNumber",
        header: "PO No",
        sortable: true,
        filterable: true,
        filterType: "text",
        width: "130px",
        render: (_: unknown, row: SalesOrderRecord) => (
          <span className="font-mono text-xs font-semibold text-navy-700">{row.poNumber ?? "—"}</span>
        ),
      });
    }

    baseColumns.push(
      {
        key: "customer",
        header:
          sourceFilter === "sample"
            ? "Issued To Employee"
            : sourceFilter === "purchase_return"
              ? "Supplier"
              : "Customer / Issued To",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: CUSTOMER_OPTIONS,
        width: "180px",
        render: (_: unknown, row: SalesOrderRecord) => (
          <div className="min-w-0">
            <span className="text-xs text-foreground font-semibold block truncate">{row.customer}</span>
            {isPurchaseReturn && row.supplierCode && (
              <span className="text-[11px] text-muted-foreground font-mono">{row.supplierCode}</span>
            )}
          </div>
        ),
      },
      {
        key: "warehouse",
        header: "Source Warehouse",
        sortable: true,
        width: "160px",
        render: (_: unknown, row: SalesOrderRecord) => (
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
    );

    if (isPurchaseReturn) {
      baseColumns.push({
        key: "totalQuantity",
        header: "Return Qty",
        sortable: true,
        align: "right",
        width: "90px",
        render: (val: unknown) => (
          <span className="font-mono text-xs tabular-nums">{val as number}</span>
        ),
      });
    }

    baseColumns.push(
      {
        key: "orderAmount",
        header: "Amount",
        sortable: true,
        align: "right",
        width: "100px",
        render: (_: unknown, row: SalesOrderRecord) => (
          <span className="font-mono text-xs tabular-nums">
            {formatWarehouseOrderAmount(resolveWarehouseOrderType(row), row.orderAmount)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: READY_STATUS_OPTIONS,
        width: "140px",
        render: (_: unknown, row: SalesOrderRecord) => {
          const label = readyStatusLabel(row);
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

    return baseColumns;
  }, [sourceFilter]);

  const actions: ActionItemConfig<SalesOrderRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => router.push(`/warehouse/packing/view/${row.id}`),
    },
    {
      label: "Create Packing",
      action: "create_packing",
      icon: PlusCircle,
      onClick: (row) => router.push(`/warehouse/packing/create/${row.id}`),
    },
  ];

  return (
    <MasterListing<SalesOrderRecord>
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
        searchPlaceholder={sourceFilter === "purchase_return" ? "Search returns..." : "Search orders..."}
      />
  );
}
