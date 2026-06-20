"use client";

import { useMemo, useState } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Layers, IndianRupee, Package, Warehouse, AlertTriangle } from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  computeBatchRegister,
  getInventoryDashboardMetrics,
  type BatchRegisterRow,
  WAREHOUSE_FILTER_OPTIONS,
} from "@/lib/accounts/inventory-accounting-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  EnterpriseTable,
  StockStatusBadge,
  type EnterpriseTableColumn,
} from "@/components/ui/EnterpriseTable";

const CP_MISSING_MSG = "CP missing in Pricing Master.";

function formatStockValue(value: number, cpMissing: boolean, availableQty: number): string {
  if (cpMissing && availableQty > 0) return CP_MISSING_MSG;
  return formatMoney(value);
}

const BATCH_COLUMNS: EnterpriseTableColumn<BatchRegisterRow>[] = [
  {
    key: "product",
    label: "Product",
    render: (val) => <span className="font-medium">{String(val)}</span>,
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
        {formatStockValue(row.stockValue, row.cpMissing, row.availableQty)}
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

export default function BatchRegisterPage() {
  const [warehouse, setWarehouse] = useState("All");

  const rows = useMemo(
    () =>
      computeBatchRegister({
        warehouse: warehouse === "All" ? undefined : warehouse,
      }),
    [warehouse],
  );

  const metrics = useMemo(() => getInventoryDashboardMetrics(), []);

  const totalValue = rows.reduce((s, r) => s + (r.cpMissing && r.availableQty > 0 ? 0 : r.stockValue), 0);
  const cpMissingCount = rows.filter((r) => r.cpMissing && r.availableQty > 0).length;

  return (
    <ListingContainer
      title="Batch Register"
      titleIcon={Layers}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MiniKPICard label="Batch Lines" value={rows.length} icon={Layers} accent />
          <MiniKPICard label="Total Stock Value" value={formatMoney(totalValue)} icon={IndianRupee} />
          <MiniKPICard label="Available Qty" value={metrics.totalAvailableQty} icon={Package} />
          <MiniKPICard label="Warehouses" value={new Set(rows.map((r) => r.warehouse)).size} icon={Warehouse} />
          {cpMissingCount > 0 && (
            <MiniKPICard label="CP Missing" value={cpMissingCount} icon={AlertTriangle} />
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Warehouse:</span>
          <AutocompleteSelect
            value={warehouse}
            onChange={setWarehouse}
            options={[{ label: "All", value: "All" }, ...WAREHOUSE_FILTER_OPTIONS.map((w) => ({ label: w, value: w }))]}
            className="w-48"
          />
        </div>
      }
    >
      <EnterpriseTable
        data={rows}
        columns={BATCH_COLUMNS}
        title="Batch Inventory"
        subtitle="Product · SKU · UOM · Pack Size · Units Per Pack · Batch No · Warehouse · Available Qty · CP · Stock Value · Mfg Date · Expiry Date · Stock Status"
        perPage={10}
        getRowKey={(row) => `${row.sku}-${row.batchNo}-${row.warehouse}`}
      />
    </ListingContainer>
  );
}
