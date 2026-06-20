"use client";

import { useMemo, useState } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Layers, IndianRupee, Package, Warehouse, AlertTriangle } from "lucide-react";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  computeBatchRegister,
  computeBatchRegisterSummary,
  WAREHOUSE_FILTER_OPTIONS,
} from "@/lib/accounts/inventory-accounting-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  buildBatchRegisterColumns,
  BATCH_REGISTER_TABLE_SUBTITLE,
  EnterpriseTable,
} from "@/components/inventory/batch-register-columns";

const BATCH_COLUMNS = buildBatchRegisterColumns();

export default function BatchRegisterPage() {
  const [warehouse, setWarehouse] = useState("All");

  const rows = useMemo(
    () =>
      computeBatchRegister({
        warehouse: warehouse === "All" ? undefined : warehouse,
      }),
    [warehouse],
  );

  const summary = useMemo(() => computeBatchRegisterSummary(rows), [rows]);

  return (
    <ListingContainer
      title="Batch Register"
      titleIcon={Layers}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MiniKPICard label="Batch Lines" value={summary.batchLines} icon={Layers} accent />
          <MiniKPICard label="Total Stock Value" value={formatMoney(summary.totalStockValue)} icon={IndianRupee} />
          <MiniKPICard label="Available Qty" value={summary.totalAvailableQty} icon={Package} />
          <MiniKPICard label="Warehouses" value={summary.warehouseCount} icon={Warehouse} />
          {summary.cpMissingCount > 0 && (
            <MiniKPICard label="CP Missing" value={summary.cpMissingCount} icon={AlertTriangle} />
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
        subtitle={BATCH_REGISTER_TABLE_SUBTITLE}
        perPage={10}
        getRowKey={(row) => `${row.sku}-${row.batchNo}-${row.warehouse}`}
      />
    </ListingContainer>
  );
}
