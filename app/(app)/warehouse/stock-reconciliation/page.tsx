"use client";

import { useMemo, useState } from "react";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { Scale, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  createStockReconciliation,
  loadStockReconciliations,
  postStockReconciliationRecord,
  getReconciliationStockOptions,
} from "@/lib/accounts/stock-reconciliation-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { Badge } from "@/components/ui/badge";

export default function StockReconciliationPage() {
  const [records, setRecords] = useState(() => loadStockReconciliations());
  const stockOptions = useMemo(() => getReconciliationStockOptions(), []);

  const [selectedStockId, setSelectedStockId] = useState(stockOptions[0]?.stockId ?? "");
  const [physicalQty, setPhysicalQty] = useState(0);
  const [reason, setReason] = useState("");

  const selected = stockOptions.find((s) => s.stockId === selectedStockId);

  const reload = () => setRecords(loadStockReconciliations());

  const handleCreate = () => {
    if (!selected) return;
    createStockReconciliation({
      date: new Date().toISOString().slice(0, 10),
      warehouse: selected.warehouse,
      product: selected.product,
      sku: selected.sku,
      batchNo: selected.batchNo,
      systemQty: selected.availableQty,
      physicalQty,
      costPrice: selected.costPrice,
      reason: reason || "Physical stock count variance",
    });
    reload();
    setReason("");
  };

  const handlePost = (id: string) => {
    const result = postStockReconciliationRecord(id);
    if (!result.ok) alert(result.error);
    reload();
  };

  const pending = records.filter((r) => r.status === "draft").length;
  const posted = records.filter((r) => r.status === "posted").length;
  const totalAdj = records.reduce((s, r) => s + Math.abs(r.differenceValue), 0);

  return (
    <ListingContainer
      title="Stock Reconciliation"
      titleIcon={Scale}
      metrics={
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MiniKPICard label="Total Records" value={records.length} icon={Scale} accent />
          <MiniKPICard label="Pending" value={pending} icon={Plus} />
          <MiniKPICard label="Posted / Adjusted Value" value={formatMoney(totalAdj)} icon={CheckCircle2} />
        </div>
      }
    >
      <div className="p-4 border-b border-border/60 bg-muted/10">
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">New Reconciliation</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="space-y-1 col-span-2">
            <Label className="text-[10px]">Stock Line</Label>
            <select
              className="h-8 w-full text-xs border rounded-lg px-2 bg-white"
              value={selectedStockId}
              onChange={(e) => {
                setSelectedStockId(e.target.value);
                const row = stockOptions.find((s) => s.stockId === e.target.value);
                setPhysicalQty(row?.availableQty ?? 0);
              }}
            >
              {stockOptions.map((s) => (
                <option key={s.stockId} value={s.stockId}>
                  {s.product} | {s.batchNo} | {s.warehouse} (Sys: {s.availableQty})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Physical Qty</Label>
            <Input
              type="number"
              className="h-8 text-xs"
              value={physicalQty}
              onChange={(e) => setPhysicalQty(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-[10px]">Reason</Label>
            <Input className="h-8 text-xs" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Count variance reason" />
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={handleCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Reconciliation
          </Button>
        </div>
        {selected && (
          <p className="text-[10px] text-muted-foreground mt-2">
            System: {selected.availableQty} × CP {formatMoney(selected.costPrice)} = {formatMoney(selected.stockValue)}
            {" · "}
            Diff: {physicalQty - selected.availableQty} → {formatMoney((physicalQty - selected.availableQty) * selected.costPrice)}
            {physicalQty < selected.availableQty
              ? " (Dr Inventory Loss / Cr Stock-in-Hand)"
              : physicalQty > selected.availableQty
                ? " (Dr Stock-in-Hand / Cr Adjustment Gain)"
                : ""}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/20 text-muted-foreground text-left">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Warehouse</th>
              <th className="px-3 py-2">Product / SKU</th>
              <th className="px-3 py-2">Batch</th>
              <th className="px-3 py-2 text-right">System</th>
              <th className="px-3 py-2 text-right">Physical</th>
              <th className="px-3 py-2 text-right">Diff</th>
              <th className="px-3 py-2 text-right">CP</th>
              <th className="px-3 py-2 text-right">Diff Value</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-border/40">
                <td className="px-3 py-2">{r.date}</td>
                <td className="px-3 py-2">{r.warehouse}</td>
                <td className="px-3 py-2">{r.product} <span className="font-mono text-muted-foreground">({r.sku})</span></td>
                <td className="px-3 py-2 font-mono">{r.batchNo}</td>
                <td className="px-3 py-2 text-right">{r.systemQty}</td>
                <td className="px-3 py-2 text-right">{r.physicalQty}</td>
                <td className="px-3 py-2 text-right">{r.differenceQty}</td>
                <td className="px-3 py-2 text-right">{formatMoney(r.costPrice)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatMoney(r.differenceValue)}</td>
                <td className="px-3 py-2 max-w-[160px] truncate">{r.reason}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.status === "posted" ? "default" : "secondary"} className="text-[10px]">
                    {r.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {r.status === "draft" && r.differenceQty !== 0 && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handlePost(r.id)}>
                      Post
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListingContainer>
  );
}
