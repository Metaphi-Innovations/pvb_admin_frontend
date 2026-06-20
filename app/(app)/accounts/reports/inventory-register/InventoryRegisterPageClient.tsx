"use client";

import { useMemo, useState } from "react";
import { FileText, ArrowDownLeft, ArrowUpRight, Package } from "lucide-react";
import { AccountsReportShell, ReportFilterBar } from "@/components/accounts/AccountsReportShell";
import {
  computeInventoryRegister,
  WAREHOUSE_FILTER_OPTIONS,
} from "@/lib/accounts/inventory-accounting-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function InventoryRegisterPageClient() {
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [warehouse, setWarehouse] = useState("all");
  const [sku, setSku] = useState("all");

  const products = useMemo(() => loadProducts().filter((p) => p.status === "active"), []);

  const source = useMemo(
    () =>
      computeInventoryRegister({
        dateFrom,
        dateTo,
        warehouse: warehouse === "all" ? undefined : warehouse,
        sku: sku === "all" ? undefined : sku,
      }),
    [dateFrom, dateTo, warehouse, sku],
  );

  const totalIn = source.reduce((s, r) => s + r.inQty, 0);
  const totalOut = source.reduce((s, r) => s + r.outQty, 0);

  const rows = source.map((r) => ({
    date: r.date,
    voucherType: r.voucherType,
    voucherNo: r.voucherNo,
    product: r.product,
    sku: r.sku,
    warehouse: r.warehouse,
    batchNo: r.batchNo,
    inQty: r.inQty || "—",
    outQty: r.outQty || "—",
    balanceQty: r.balanceQty,
    rate: formatMoney(r.rate),
    stockValue: formatMoney(r.stockValue),
    source: r.source,
  }));

  return (
    <AccountsReportShell
      section="Reports"
      title="Inventory Register"
      description="Product-wise and warehouse-wise stock movements from GRN, dispatch, opening, returns, and reconciliation."
      kpis={[
        { label: "Movements", value: String(source.length), icon: FileText, accent: true },
        { label: "Total In Qty", value: String(totalIn), icon: ArrowDownLeft },
        { label: "Total Out Qty", value: String(totalOut), icon: ArrowUpRight },
        { label: "Products", value: String(new Set(source.map((r) => r.sku)).size), icon: Package },
      ]}
      filters={
        <div className="flex flex-wrap items-end gap-2">
          <ReportFilterBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            branch=""
            onDateFrom={setDateFrom}
            onDateTo={setDateTo}
            onBranch={() => {}}
          />
          <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
            <option value="all">All Warehouses</option>
            {WAREHOUSE_FILTER_OPTIONS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={sku} onChange={(e) => setSku(e.target.value)}>
            <option value="all">All SKUs</option>
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>{p.sku} — {p.productName}</option>
            ))}
          </select>
        </div>
      }
      columns={[
        { key: "date", label: "Date" },
        { key: "voucherType", label: "Voucher Type" },
        { key: "voucherNo", label: "Voucher No", mono: true },
        { key: "product", label: "Product" },
        { key: "sku", label: "SKU", mono: true },
        { key: "warehouse", label: "Warehouse" },
        { key: "batchNo", label: "Batch No", mono: true },
        { key: "inQty", label: "In Qty", align: "right" },
        { key: "outQty", label: "Out Qty", align: "right" },
        { key: "balanceQty", label: "Balance Qty", align: "right" },
        { key: "rate", label: "Rate / CP", align: "right", money: true },
        { key: "stockValue", label: "Stock Value", align: "right", money: true },
        { key: "source", label: "Source" },
      ]}
      rows={rows}
      emptyMessage="No inventory movements for selected period."
    />
  );
}
