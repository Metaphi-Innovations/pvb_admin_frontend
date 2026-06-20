"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  loadAccountItems,
} from "@/lib/accounts/account-items-data";
import {
  loadStockOpeningRows,
  saveStockOpeningRows,
  WAREHOUSE_OPTIONS,
  type StockOpeningRow,
} from "@/lib/accounts/stock-opening-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { stockOpeningImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";

export default function StockOpeningPageClient() {
  const [rows, setRows] = useState<StockOpeningRow[]>(() => loadStockOpeningRows());
  const items = useMemo(() => loadAccountItems(), []);

  const [fy, setFy] = useState("2026-27");
  const [date, setDate] = useState("2026-04-01");
  const [warehouse, setWarehouse] = useState(WAREHOUSE_OPTIONS[0]);
  const [itemSku, setItemSku] = useState(items[0]?.sku ?? "");
  const [qty, setQty] = useState(0);
  const [rate, setRate] = useState(0);
  const [batchNo, setBatchNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [remarks, setRemarks] = useState("");

  const addRow = () => {
    const item = items.find((i) => i.sku === itemSku);
    if (!item) return;
    const row: StockOpeningRow = {
      id: `so-${Date.now()}`,
      financialYear: fy,
      date,
      warehouse,
      itemName: item.itemName,
      sku: item.sku,
      openingQty: qty,
      rate,
      openingValue: qty * rate,
      batchNo,
      expiryDate: expiry,
      remarks,
    };
    const next = [...rows, row];
    setRows(next);
    saveStockOpeningRows(next);
  };

  const totalOpening = useMemo(() => rows.reduce((s, r) => s + r.openingValue, 0), [rows]);
  const impactLines = useMemo(() => stockOpeningImpactResolved(totalOpening), [totalOpening]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Transactions", "Stock Opening")}
      title="Stock Opening"
      description="Opening stock entry — Dr Inventory, Cr Opening Balance Adjustment."
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 p-4 border-b border-border/60 bg-muted/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Add Opening Entry
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Financial Year</Label>
              <Input className="h-8 text-xs" value={fy} onChange={(e) => setFy(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Date</Label>
              <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Warehouse</Label>
              <select className="h-8 w-full text-xs border rounded-lg px-2 bg-white" value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
                {WAREHOUSE_OPTIONS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Item</Label>
              <select className="h-8 w-full text-xs border rounded-lg px-2 bg-white" value={itemSku} onChange={(e) => setItemSku(e.target.value)}>
                {items.map((i) => (
                  <option key={i.sku} value={i.sku}>{i.itemName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Qty</Label>
              <Input type="number" className="h-8 text-xs" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Rate</Label>
              <Input type="number" className="h-8 text-xs" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Batch No</Label>
              <Input className="h-8 text-xs" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Expiry</Label>
              <Input type="date" className="h-8 text-xs" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[10px]">Remarks</Label>
              <Input className="h-8 text-xs" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button size="sm" className="h-8 text-xs bg-brand-600 text-white" onClick={addRow}>
                Add Row
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead className="bg-muted/20 border-b sticky top-0">
              <tr>
                {["Item", "Warehouse", "Qty", "Rate", "Value", "Batch", "Expiry", "FY"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="px-3 py-2">{r.itemName}</td>
                  <td className="px-3 py-2">{r.warehouse}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.openingQty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.rate)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.openingValue)}</td>
                  <td className="px-3 py-2 font-mono">{r.batchNo || "—"}</td>
                  <td className="px-3 py-2">{r.expiryDate || "—"}</td>
                  <td className="px-3 py-2">{r.financialYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LedgerImpactPreview lines={impactLines} title="Ledger Impact Preview" className="mt-4" />
    </AccountsPageShell>
  );
}
