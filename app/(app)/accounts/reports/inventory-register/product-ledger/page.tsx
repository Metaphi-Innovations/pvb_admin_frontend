"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AccountsReportShell, ReportFilterBar } from "@/components/accounts/AccountsReportShell";
import {
  buildProductInventoryLedger,
  WAREHOUSE_FILTER_OPTIONS,
} from "@/lib/accounts/inventory-accounting-data";
import { formatMoney } from "@/lib/accounts/money-format";

function ProductLedgerInner() {
  const params = useSearchParams();
  const sku = params.get("sku") ?? "";
  const product = params.get("product") ?? sku;
  const initialWarehouse = params.get("warehouse") ?? "all";

  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [warehouse, setWarehouse] = useState(initialWarehouse || "all");
  const [batchNo, setBatchNo] = useState("all");

  const source = useMemo(
    () =>
      buildProductInventoryLedger(sku, {
        dateFrom,
        dateTo,
        warehouse: warehouse === "all" ? undefined : warehouse,
        batchNo: batchNo === "all" ? undefined : batchNo,
      }),
    [sku, dateFrom, dateTo, warehouse, batchNo],
  );

  const batchOptions = useMemo(
    () => Array.from(new Set(source.map((r) => r.batchNo))).filter((b) => b && b !== "—"),
    [source],
  );

  const closingBalance = source.length ? source[source.length - 1].balanceQty : 0;

  const rows = source.map((r) => ({
    date: r.date,
    voucherType: r.voucherType,
    voucherNo: r.voucherNo,
    warehouse: r.warehouse,
    batchNo: r.batchNo,
    inQty: r.inQty || "—",
    outQty: r.outQty || "—",
    balanceQty: r.balanceQty,
    rate: formatMoney(r.rate),
    value: formatMoney(r.value),
    narration: r.narration,
  }));

  return (
    <AccountsReportShell
      section="Reports"
      title="Product Inventory Ledger"
      description={`Stock ledger for ${product} (${sku}) — movements with running balance at cost price.`}
      kpis={[
        { label: "SKU", value: sku || "—", icon: BookOpen, accent: true },
        { label: "Entries", value: String(source.length), icon: BookOpen },
        { label: "Closing Qty", value: String(closingBalance), icon: ArrowDownLeft },
        {
          label: "Closing Value",
          value: formatMoney(source.length ? source[source.length - 1].value : 0),
          icon: ArrowUpRight,
        },
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
          <select className="h-8 text-xs border rounded-lg px-2 bg-white" value={batchNo} onChange={(e) => setBatchNo(e.target.value)}>
            <option value="all">All Batches</option>
            {batchOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      }
      columns={[
        { key: "date", label: "Date" },
        { key: "voucherType", label: "Voucher Type" },
        { key: "voucherNo", label: "Voucher No", mono: true },
        { key: "warehouse", label: "Warehouse" },
        { key: "batchNo", label: "Batch No", mono: true },
        { key: "inQty", label: "In Qty", align: "right" },
        { key: "outQty", label: "Out Qty", align: "right" },
        { key: "balanceQty", label: "Balance Qty", align: "right" },
        { key: "rate", label: "Rate", align: "right", money: true },
        { key: "value", label: "Value", align: "right", money: true },
        { key: "narration", label: "Narration" },
      ]}
      rows={rows}
      emptyMessage="No ledger entries for this product."
    />
  );
}

export default function ProductInventoryLedgerPageClient() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading ledger…</div>}>
      <ProductLedgerInner />
    </Suspense>
  );
}
