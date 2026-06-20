"use client";

import { useMemo, useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  computeBatchRegister,
  ensureInventoryAccountingLedgers,
  type BatchRegisterRow,
} from "@/lib/accounts/inventory-accounting-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { useClientReady } from "@/lib/hooks/use-client-ready";
import {
  buildBatchRegisterColumns,
  formatBatchStockValue,
  CP_MISSING_MSG,
  EnterpriseTable,
} from "@/components/inventory/batch-register-columns";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportWarehouseFilter,
  ReportProductFilter,
} from "@/components/accounts/ReportFilters";

function exportBatchRegisterCsv(rows: BatchRegisterRow[]) {
  const headers = [
    "Product",
    "SKU",
    "UOM",
    "Pack Size",
    "Units Per Pack",
    "Batch No",
    "Warehouse",
    "Available Qty",
    "CP",
    "Stock Value",
    "Mfg Date",
    "Expiry Date",
    "Stock Status",
  ];
  const body = rows.map((r) =>
    [
      r.product,
      r.sku,
      r.uom,
      r.packSize,
      r.unitsPerPack,
      r.batchNo,
      r.warehouse,
      r.availableQty,
      r.cpMissing ? CP_MISSING_MSG : r.costPrice,
      formatBatchStockValue(r.stockValue, r.cpMissing, r.availableQty),
      r.mfgDate,
      r.expiryDate,
      r.stockStatus,
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stock-valuation.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function StockValuationPageClient() {
  const clientReady = useClientReady();
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [warehouse, setWarehouse] = useState("all");
  const [product, setProduct] = useState("all");

  useEffect(() => {
    ensureInventoryAccountingLedgers();
  }, []);

  useEffect(() => {
    if (clientReady) {
      setAsOnDate(defaultAsOnDate());
    }
  }, [clientReady]);

  const products = useMemo(() => {
    if (!clientReady) return [];
    return loadProducts().filter((p) => p.status === "active");
  }, [clientReady]);

  const rows = useMemo(() => {
    if (!clientReady) return [];
    return computeBatchRegister({
      asOnDate,
      warehouse: warehouse === "all" ? undefined : warehouse,
      product: product === "all" ? undefined : product,
    });
  }, [clientReady, asOnDate, warehouse, product]);

  const columns = useMemo(() => buildBatchRegisterColumns(), []);

  if (!clientReady) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
        title="Stock Valuation"
        description="Financial view of inventory stock value as on date."
      >
        <div className="p-6 text-sm text-muted-foreground">Loading stock valuation…</div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description="Stock value by warehouse and product. Valuation uses cost price from Pricing Master."
      actions={
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => exportBatchRegisterCsv(rows)}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      }
      filters={
        <ReportFilterRow>
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportWarehouseFilter value={warehouse} onChange={setWarehouse} />
          <ReportProductFilter value={product} onChange={setProduct} products={products} />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex-1 overflow-auto min-h-0 p-4">
        <EnterpriseTable
          data={rows}
          columns={columns}
          perPage={25}
          hideToolbar
          showSelection={false}
          showRowActions={false}
          showBulkActions={false}
          getRowKey={(row) => `${row.sku}-${row.batchNo}-${row.warehouse}`}
        />
      </div>
    </AccountsPageShell>
  );
}
