"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { QcItem } from "../../types";
import { ProductSkuCell } from "@/app/(app)/warehouse/grn/shared/components/ProductSkuCell";
import { StackedQtyCell } from "@/app/(app)/warehouse/grn/shared/components/StackedQtyCell";
import { qcItemQtyStack } from "../qc-quantity";

const TH =
  "px-3 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap";
const TH_CENTER = cn(TH, "text-center");
const TD = "px-3 py-2.5 align-middle text-xs";

function QtyStackCell({
  item,
  baseQty,
  accent,
}: {
  item: QcItem;
  baseQty: number;
  accent?: "brand" | "emerald" | "red";
}) {
  const stack = qcItemQtyStack(baseQty, item);
  return (
    <StackedQtyCell
      stack={stack}
      empty={!(baseQty > 0)}
      className={
        accent === "brand"
          ? "[&_p:first-child]:text-brand-700"
          : accent === "emerald"
            ? "[&_p:first-child]:text-emerald-700"
            : accent === "red"
              ? "[&_p:first-child]:text-red-700"
              : undefined
      }
    />
  );
}

export function QcInspectionSummaryTable({ items }: { items: QcItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">No batch rows found.</p>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className={cn(TH, "min-w-[160px]")}>Product</th>
              <th className={cn(TH, "w-28")}>Batch No.</th>
              <th className={cn(TH, "w-28")}>MFG Date</th>
              <th className={cn(TH, "w-28")}>Expiry Date</th>
              <th className={cn(TH_CENTER, "w-36")}>Qty</th>
              <th className={cn(TH_CENTER, "w-36 text-emerald-800")}>Accepted</th>
              <th className={cn(TH_CENTER, "w-36 text-red-800")}>Rejected</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={`${item.grnBatchId ?? item.batchNumber}-${idx}`}
                className="border-b border-border/60 bg-muted/5"
              >
                <td className={cn(TD, "min-w-[160px]")}>
                  <ProductSkuCell name={item.productName} sku={item.productCode} />
                </td>
                <td className={cn(TD, "font-mono font-semibold text-brand-700")}>
                  {item.batchNumber || "—"}
                </td>
                <td className={cn(TD, "text-muted-foreground")}>
                  {item.mfgDate?.trim() ? item.mfgDate : "—"}
                </td>
                <td className={cn(TD, "text-muted-foreground")}>
                  {item.expDate?.trim() ? item.expDate : "—"}
                </td>
                <td className={cn(TD, "text-center")}>
                  <QtyStackCell item={item} baseQty={item.receivedQty} accent="brand" />
                </td>
                <td className={cn(TD, "text-center")}>
                  <QtyStackCell item={item} baseQty={item.acceptedQty} accent="emerald" />
                </td>
                <td className={cn(TD, "text-center")}>
                  <QtyStackCell item={item} baseQty={item.rejectedQty} accent="red" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QcAcceptedStockTable({ items }: { items: QcItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-emerald-50/20 border-b border-border">
              <th className={cn(TH, "text-emerald-800 min-w-[160px]")}>Product</th>
              <th className={cn(TH, "text-emerald-800 w-28")}>Batch No.</th>
              <th className={cn(TH, "text-emerald-800 w-28")}>MFG Date</th>
              <th className={cn(TH, "text-emerald-800 w-28")}>Expiry Date</th>
              <th className={cn(TH_CENTER, "text-emerald-800 w-36")}>Accepted Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`acc-${item.grnBatchId ?? idx}`} className="border-b border-border/50">
                <td className={TD}>
                  <ProductSkuCell name={item.productName} sku={item.productCode} />
                </td>
                <td className={cn(TD, "font-mono font-medium text-muted-foreground")}>
                  {item.batchNumber || "—"}
                </td>
                <td className={cn(TD, "text-muted-foreground")}>
                  {item.mfgDate?.trim() ? item.mfgDate : "—"}
                </td>
                <td className={cn(TD, "text-muted-foreground")}>
                  {item.expDate?.trim() ? item.expDate : "—"}
                </td>
                <td className={cn(TD, "text-center bg-emerald-50/10")}>
                  <QtyStackCell item={item} baseQty={item.acceptedQty} accent="emerald" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QcRejectedStockTable({ items }: { items: QcItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="bg-red-50/10 border-b border-border">
              <th className={cn(TH, "text-red-800 min-w-[160px]")}>Product</th>
              <th className={cn(TH, "text-red-800 w-28")}>Batch No.</th>
              <th className={cn(TH, "text-red-800 w-28")}>MFG Date</th>
              <th className={cn(TH, "text-red-800 w-28")}>Expiry Date</th>
              <th className={cn(TH_CENTER, "text-red-800 w-36")}>Rejected Qty</th>
              <th className={cn(TH, "text-red-800 w-32")}>Reject Type</th>
              <th className={cn(TH, "text-red-800 min-w-[140px]")}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`rej-${item.grnBatchId ?? idx}`} className="border-b border-border/50">
                <td className={TD}>
                  <ProductSkuCell name={item.productName} sku={item.productCode} />
                </td>
                <td className={cn(TD, "font-mono font-medium text-muted-foreground")}>
                  {item.batchNumber || "—"}
                </td>
                <td className={cn(TD, "text-muted-foreground")}>
                  {item.mfgDate?.trim() ? item.mfgDate : "—"}
                </td>
                <td className={cn(TD, "text-muted-foreground")}>
                  {item.expDate?.trim() ? item.expDate : "—"}
                </td>
                <td className={cn(TD, "text-center bg-red-50/10")}>
                  <QtyStackCell item={item} baseQty={item.rejectedQty} accent="red" />
                </td>
                <td className={cn(TD, "font-medium")}>
                  {item.rejectType === "DAMAGED"
                    ? "Damaged"
                    : item.rejectType === "EXPIRED"
                      ? "Expired"
                      : "—"}
                </td>
                <td className={cn(TD, "text-red-800 italic font-medium")}>
                  {item.rejectionReason?.trim() ? item.rejectionReason : "No reason specified"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
