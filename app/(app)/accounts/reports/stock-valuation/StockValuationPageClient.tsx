"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  IndianRupee,
  AlertTriangle,
  Warehouse,
  Scale,
  Clock,
  Skull,
  Boxes,
} from "lucide-react";
import { AccountsReportShell } from "@/components/accounts/AccountsReportShell";
import {
  computeStockValuationRows,
  stockValuationSummary,
  computeWarehouseValuationSummary,
  computeProductValuationSummary,
  getInventoryAssetReconciliation,
  ensureInventoryAccountingLedgers,
  WAREHOUSE_FILTER_OPTIONS,
  type ExpiryBucket,
} from "@/lib/accounts/inventory-accounting-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Badge } from "@/components/ui/badge";

const CP_MISSING_MSG = "CP missing in Pricing Master.";

const EXPIRY_OPTIONS: ExpiryBucket[] = [
  "all",
  "Expired",
  "Expiring in 30 Days",
  "Expiring in 60 Days",
  "Expiring in 90 Days",
  "Healthy Stock",
];

function formatCp(costPrice: number, cpMissing: boolean): string {
  if (cpMissing) return CP_MISSING_MSG;
  return formatMoney(costPrice);
}

function formatStockValue(stockValue: number, cpMissing: boolean, availableQty: number): string {
  if (cpMissing && availableQty > 0) return CP_MISSING_MSG;
  return formatMoney(stockValue);
}

export default function StockValuationPageClient() {
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouse, setWarehouse] = useState("all");
  const [product, setProduct] = useState("all");
  const [sku, setSku] = useState("all");
  const [batch, setBatch] = useState("all");
  const [status, setStatus] = useState("all");
  const [expiryBucket, setExpiryBucket] = useState<ExpiryBucket>("all");

  useEffect(() => {
    ensureInventoryAccountingLedgers();
  }, []);

  const products = useMemo(() => loadProducts().filter((p) => p.status === "active"), []);

  const rawRows = useMemo(
    () =>
      computeStockValuationRows({
        asOnDate,
        warehouse,
        product,
        sku,
        batch,
        status,
        expiryBucket,
      }),
    [asOnDate, warehouse, product, sku, batch, status, expiryBucket],
  );

  const summary = useMemo(() => stockValuationSummary(rawRows, asOnDate), [rawRows, asOnDate]);
  const whSummary = useMemo(() => computeWarehouseValuationSummary(rawRows), [rawRows]);
  const productSummary = useMemo(() => computeProductValuationSummary(rawRows), [rawRows]);
  const coaMatch = useMemo(
    () => getInventoryAssetReconciliation(summary.totalInventoryValue),
    [summary.totalInventoryValue],
  );

  const batchOptions = useMemo(
    () => Array.from(new Set(rawRows.map((r) => r.batchNo))).sort(),
    [rawRows],
  );

  const ledgerHref = (rowSku: string, rowProduct: string) =>
    `/accounts/reports/inventory-register/product-ledger?sku=${encodeURIComponent(rowSku)}&product=${encodeURIComponent(rowProduct)}&warehouse=${encodeURIComponent(warehouse === "all" ? "" : warehouse)}`;

  const rows = rawRows.map((r) => ({
    product: (
      <Link href={ledgerHref(r.sku, r.product)} className="text-primary hover:underline font-medium">
        {r.product}
      </Link>
    ),
    sku: r.sku,
    uom: r.uom || "—",
    warehouse: r.warehouse,
    batchNo: r.batchNo,
    availableQty: r.availableQty,
    reservedQty: r.reservedQty,
    costPrice: formatCp(r.costPrice, r.cpMissing),
    stockValue: formatStockValue(r.stockValue, r.cpMissing, r.availableQty),
    expiryStatus: r.expiryBucket,
    _sku: r.sku,
  }));

  const whRows = whSummary.map((w) => ({
    warehouse: w.warehouse,
    totalSkus: w.totalSkus,
    availableQty: w.availableQty,
    reservedQty: w.reservedQty,
    inventoryValue: formatMoney(w.inventoryValue),
  }));

  const productRows = productSummary.map((p) => ({
    product: p.product,
    sku: p.sku,
    uom: p.uom || "—",
    availableQty: p.availableQty,
    reservedQty: p.reservedQty,
    inventoryValue: formatMoney(p.inventoryValue),
  }));

  return (
    <div className="space-y-4">
      {summary.cpMissingCount > 0 && (
        <div className="mx-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {summary.cpMissingCount} batch line(s) have available stock but no CP in Pricing Master. Stock value is excluded from totals until CP is set.
        </div>
      )}

      <AccountsReportShell
        section="Reports"
        title="Stock Valuation"
        description={`Stock Value = Available Qty × CP (Cost Price from Pricing Master only). Valued in UOM/pack unit as on ${asOnDate}.`}
        kpis={[
          {
            label: "Total Stock Value",
            value: formatMoney(summary.totalInventoryValue),
            icon: IndianRupee,
            accent: true,
          },
          {
            label: "Warehouse-wise Value",
            value: formatMoney(whSummary.reduce((s, w) => s + w.inventoryValue, 0)),
            icon: Warehouse,
          },
          {
            label: "Product-wise Value",
            value: formatMoney(productSummary.reduce((s, p) => s + p.inventoryValue, 0)),
            icon: Package,
          },
          {
            label: "Expired Stock Value",
            value: formatMoney(summary.expiredStockValue),
            icon: Skull,
          },
          {
            label: "Near Expiry Stock Value",
            value: formatMoney(summary.nearExpiryStockValue),
            icon: Clock,
          },
          {
            label: "Total Available Qty",
            value: String(summary.totalAvailableQty),
            icon: Boxes,
          },
        ]}
        filters={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">As on Date</label>
              <input
                type="date"
                className="h-8 text-xs border border-border rounded-lg px-2 bg-white block"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
              />
            </div>
            <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
              <option value="all">All Warehouses</option>
              {WAREHOUSE_FILTER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={product} onChange={(e) => setProduct(e.target.value)}>
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.productName}>{p.productName}</option>
              ))}
            </select>
            <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={sku} onChange={(e) => setSku(e.target.value)}>
              <option value="all">All SKUs</option>
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>{p.sku}</option>
              ))}
            </select>
            <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={batch} onChange={(e) => setBatch(e.target.value)}>
              <option value="all">All Batches</option>
              {batchOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Near Expiry">Near Expiry</option>
              <option value="Expired">Expired</option>
            </select>
            <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={expiryBucket} onChange={(e) => setExpiryBucket(e.target.value as ExpiryBucket)}>
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o === "all" ? "All Expiry Buckets" : o}</option>
              ))}
            </select>
          </div>
        }
        columns={[
          { key: "product", label: "Product" },
          { key: "sku", label: "SKU", mono: true },
          { key: "uom", label: "UOM" },
          { key: "warehouse", label: "Warehouse" },
          { key: "batchNo", label: "Batch No", mono: true },
          { key: "availableQty", label: "Available Qty", align: "right" },
          { key: "reservedQty", label: "Reserved Qty", align: "right" },
          { key: "costPrice", label: "CP", align: "right" },
          { key: "stockValue", label: "Stock Value", align: "right" },
          { key: "expiryStatus", label: "Expiry Status" },
        ]}
        rows={rows as unknown as Record<string, string | number>[]}
        emptyMessage="No stock rows for selected filters."
      />

      <div className="rounded-xl border border-border bg-white p-4 mx-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Inventory Asset Reconciliation</h3>
          <Badge variant={coaMatch.matched ? "default" : "destructive"} className="text-[10px]">
            {coaMatch.matched ? "Matched" : "Variance"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">COA Inventory Asset (Books)</p>
            <p className="font-semibold tabular-nums">{formatMoney(coaMatch.bookValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Stock Valuation Total</p>
            <p className="font-semibold tabular-nums">{formatMoney(coaMatch.stockValuationTotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Variance</p>
            <p className="font-semibold tabular-nums">{formatMoney(coaMatch.variance)}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Mapped to Assets → Current Assets → Inventory / Stock-in-Hand. Valuation uses CP only (not MRP/DP/RP).
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 mx-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Warehouse className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Warehouse-wise Stock Value</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 pr-3 font-medium">Warehouse</th>
                <th className="py-2 pr-3 font-medium text-right">Total SKUs</th>
                <th className="py-2 pr-3 font-medium text-right">Available Qty</th>
                <th className="py-2 pr-3 font-medium text-right">Reserved Qty</th>
                <th className="py-2 font-medium text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {whRows.map((w) => (
                <tr key={w.warehouse} className="border-b border-border/50">
                  <td className="py-2 pr-3">{w.warehouse}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{w.totalSkus}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{w.availableQty}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{w.reservedQty}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{w.inventoryValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 mx-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Product-wise Stock Value</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">SKU</th>
                <th className="py-2 pr-3 font-medium">UOM</th>
                <th className="py-2 pr-3 font-medium text-right">Available Qty</th>
                <th className="py-2 pr-3 font-medium text-right">Reserved Qty</th>
                <th className="py-2 font-medium text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((p) => (
                <tr key={p.sku} className="border-b border-border/50">
                  <td className="py-2 pr-3">{p.product}</td>
                  <td className="py-2 pr-3 font-mono">{p.sku}</td>
                  <td className="py-2 pr-3">{p.uom}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.availableQty}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.reservedQty}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{p.inventoryValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
