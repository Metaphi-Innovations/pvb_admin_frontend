"use client";

import { cn } from "@/lib/utils";
import type { PurchaseInvoiceLineQtyComparison } from "./purchase-invoices-data";

export interface QtyComparisonRow {
  productName: string;
  batchNumber?: string;
  comparison: PurchaseInvoiceLineQtyComparison;
}

interface PurchaseInvoiceQtyComparisonTableProps {
  rows: QtyComparisonRow[];
  className?: string;
}

export function PurchaseInvoiceQtyComparisonTable({
  rows,
  className,
}: PurchaseInvoiceQtyComparisonTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-xs min-w-[720px]">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Product</th>
            <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Batch</th>
            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Supplier Invoice Qty</th>
            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">GRN Received Qty</th>
            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">QC Accepted Qty</th>
            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">QC Rejected Qty</th>
            <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Short Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const c = row.comparison;
            const lineMismatch =
              Math.abs(c.supplierInvoiceQty - c.grnReceivedQty) > 0.001 || c.qcRejectedQty > 0;
            return (
              <tr
                key={`${row.productName}-${row.batchNumber ?? i}`}
                className={cn(
                  "border-b border-border/20",
                  lineMismatch && "bg-amber-50/60",
                )}
              >
                <td className="px-2 py-1.5 font-medium">{row.productName}</td>
                <td className="px-2 py-1.5 font-mono text-muted-foreground">{row.batchNumber || "—"}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{c.supplierInvoiceQty}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{c.grnReceivedQty}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-emerald-700">{c.qcAcceptedQty}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-red-600">{c.qcRejectedQty}</td>
                <td
                  className={cn(
                    "px-2 py-1.5 text-right tabular-nums font-semibold",
                    c.shortQty > 0 ? "text-amber-700" : "text-muted-foreground",
                  )}
                >
                  {c.shortQty}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PurchaseInvoiceMismatchBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 font-medium">
      <span aria-hidden>⚠</span>
      <span>Quantity Mismatch Detected</span>
      <span className="text-amber-700 font-normal">
        — Supplier invoice quantities differ from GRN/QC. A pending debit note will be created on save.
      </span>
    </div>
  );
}

export function PurchaseInvoiceMatchStatusBadge({
  status,
}: {
  status: import("./purchase-invoices-data").PurchaseInvoiceMatchStatus;
}) {
  const cfg: Record<
    import("./purchase-invoices-data").PurchaseInvoiceMatchStatus,
    { label: string; className: string }
  > = {
    matched: { label: "Matched", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    quantity_mismatch: { label: "Quantity Mismatch", className: "bg-amber-100 text-amber-800 border-amber-200" },
    debit_note_pending: { label: "Debit Note Pending", className: "bg-orange-100 text-orange-800 border-orange-200" },
    debit_note_posted: { label: "Debit Note Posted", className: "bg-navy-50 text-navy-700 border-navy-200" },
  };
  const c = cfg[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}
