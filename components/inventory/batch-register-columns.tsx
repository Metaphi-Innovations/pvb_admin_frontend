"use client";

import Link from "next/link";
import {
  EnterpriseTable,
  StockStatusBadge,
  type EnterpriseTableColumn,
} from "@/components/ui/EnterpriseTable";
import { formatMoney } from "@/lib/accounts/money-format";
import type { BatchRegisterRow } from "@/lib/accounts/inventory-accounting-data";

export const CP_MISSING_MSG = "CP missing in Pricing Master.";

export function formatBatchStockValue(value: number, cpMissing: boolean, availableQty: number): string {
  if (cpMissing && availableQty > 0) return CP_MISSING_MSG;
  return formatMoney(value);
}

export function buildBatchRegisterColumns(options?: {
  productLink?: (row: BatchRegisterRow) => string;
  valuationMethodLabel?: (row: BatchRegisterRow) => string;
}): EnterpriseTableColumn<BatchRegisterRow>[] {
  const cols: EnterpriseTableColumn<BatchRegisterRow>[] = [
    {
      key: "product",
      label: "Product",
      render: (val, row) =>
        options?.productLink ? (
          <Link href={options.productLink(row)} className="text-primary hover:underline font-medium">
            {String(val)}
          </Link>
        ) : (
          <span className="font-medium">{String(val)}</span>
        ),
    },
    {
      key: "sku",
      label: "SKU",
      render: (val) => <span className="font-mono text-xs">{String(val)}</span>,
    },
    { key: "uom", label: "UOM", render: (val) => String(val || "—") },
    { key: "packSize", label: "Pack Size", render: (val) => String(val || "—") },
    {
      key: "unitsPerPack",
      label: "Units Per Pack",
      align: "right",
      render: (val) => <span className="tabular-nums">{Number(val).toLocaleString()}</span>,
    },
    {
      key: "batchNo",
      label: "Batch No",
      render: (val) => <span className="font-mono text-xs">{String(val)}</span>,
    },
    { key: "warehouse", label: "Warehouse" },
    {
      key: "availableQty",
      label: "Available Qty",
      align: "right",
      render: (val) => {
        const qty = Number(val);
        const color = qty === 0 ? "text-red-600" : qty <= 50 ? "text-amber-600" : "text-foreground";
        return <span className={`tabular-nums font-medium ${color}`}>{qty.toLocaleString()}</span>;
      },
    },
    {
      key: "costPrice",
      label: "CP",
      align: "right",
      render: (_val, row) =>
        row.cpMissing ? (
          <span className="text-amber-700 text-[10px]">{CP_MISSING_MSG}</span>
        ) : (
          <span className="tabular-nums">{formatMoney(row.costPrice)}</span>
        ),
    },
    {
      key: "stockValue",
      label: "Stock Value",
      align: "right",
      render: (_val, row) => (
        <span
          className={`tabular-nums font-medium ${row.cpMissing && row.availableQty > 0 ? "text-amber-700 text-[10px]" : ""}`}
        >
          {formatBatchStockValue(row.stockValue, row.cpMissing, row.availableQty)}
        </span>
      ),
    },
    { key: "mfgDate", label: "Mfg Date", render: (val) => String(val || "—") },
    { key: "expiryDate", label: "Expiry Date", render: (val) => String(val || "—") },
    {
      key: "stockStatus",
      label: "Stock Status",
      render: (val) => <StockStatusBadge status={String(val)} />,
    },
  ];

  if (options?.productLink) {
    cols.push({
      key: "inventoryLedger",
      label: "Inventory Ledger",
      render: (_val, row) => (
        <Link href={options.productLink!(row)} className="text-primary hover:underline text-xs">
          View Ledger
        </Link>
      ),
    });
  }

  if (options?.valuationMethodLabel) {
    cols.push({
      key: "valuationMethod",
      label: "Valuation Method",
      render: (_val, row) => (
        <span className="text-xs capitalize">{options.valuationMethodLabel!(row).replace(/_/g, " ")}</span>
      ),
    });
  }

  return cols;
}

export const BATCH_REGISTER_TABLE_SUBTITLE =
  "Product · SKU · UOM · Pack Size · Units Per Pack · Batch No · Warehouse · Available Qty · CP · Stock Value · Mfg Date · Expiry Date · Stock Status";

export { EnterpriseTable };
