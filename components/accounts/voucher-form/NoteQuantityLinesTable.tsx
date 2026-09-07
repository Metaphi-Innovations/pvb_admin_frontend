"use client";

/**
 * Product-wise quantity lines for invoice / return based Credit / Debit Notes.
 * Simple entry columns — no eligibility / history columns.
 */

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";

export interface NoteQuantityLineView {
  id: string;
  productName: string;
  sku?: string;
  hsn?: string;
  batchNo?: string;
  mfgDate?: string;
  expiryDate?: string;
  /** Original invoice quantity (cap for editable qty) */
  originalQty: number;
  /** Already returned / credited / debited (kept for mapping; not shown) */
  previouslyAdjustedQty: number;
  /** Remaining eligible (kept for mapping; not shown) */
  remainingEligibleQty: number;
  /** Current note quantity */
  currentQty: number;
  rate: number;
  taxPct: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  uom?: string;
}

export interface NoteQuantityLinesTableProps {
  lines: NoteQuantityLineView[];
  readOnly?: boolean;
  /** When true, current qty cannot be edited (return-sourced lines). */
  qtyLocked?: boolean;
  /** When true, GST % can be edited (CGST/SGST/IGST remain computed). */
  gstEditable?: boolean;
  currentQtyLabel?: string;
  /** @deprecated Eligibility columns removed — kept for call-site compat. */
  previouslyAdjustedLabel?: string;
  onCurrentQtyChange?: (lineId: string, qty: number) => void;
  onTaxPctChange?: (lineId: string, taxPct: number) => void;
  emptyMessage?: string;
  className?: string;
}

function fmtQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n <= 0) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function fmtDate(raw?: string): string {
  const s = raw?.trim();
  if (!s) return "—";
  // Prefer YYYY-MM-DD when ISO-like
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export function NoteQuantityLinesTable({
  lines,
  readOnly,
  qtyLocked,
  gstEditable,
  currentQtyLabel = "Qty",
  onCurrentQtyChange,
  onTaxPctChange,
  emptyMessage = "No product lines.",
  className,
}: NoteQuantityLinesTableProps) {
  if (!lines.length) {
    return (
      <div className={cn("px-3 py-4 text-center text-[12px] text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  const lockQty = readOnly || qtyLocked;
  const canEditGst = Boolean(gstEditable) && !readOnly;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[1080px] accounts-table">
        <thead>
          <tr className="accounts-table-head-row bg-muted/40 border-b border-border">
            <th className="accounts-table-th !text-left">Product</th>
            <th className="accounts-table-th !text-left">Batch</th>
            <th className="accounts-table-th !text-left">Expiry</th>
            <th className="accounts-table-th !text-left">HSN</th>
            <th className="accounts-table-th !text-right">{currentQtyLabel}</th>
            <th className="accounts-table-th !text-left">UOM</th>
            <th className="accounts-table-th !text-right">Rate</th>
            <th className="accounts-table-th !text-right">Basic Amount</th>
            <th className="accounts-table-th cn-gst-pct-th !text-right">GST %</th>
            <th className="accounts-table-th !text-right">CGST</th>
            <th className="accounts-table-th !text-right">SGST</th>
            <th className="accounts-table-th !text-right">IGST</th>
            <th className="accounts-table-th !text-right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const maxQty =
              line.originalQty > 0
                ? line.originalQty
                : line.remainingEligibleQty > 0
                  ? line.remainingEligibleQty
                  : undefined;
            const overMax =
              maxQty != null && line.currentQty > maxQty + 0.0001;
            return (
              <tr key={line.id} className="border-b border-border/40">
                <td className="px-2 py-1.5 min-w-[160px] max-w-[220px] whitespace-normal">
                  <p className="text-[12px] font-normal text-foreground leading-snug">
                    {line.productName || "—"}
                  </p>
                  {line.sku?.trim() ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      SKU: {line.sku}
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-1.5 text-[12px] font-mono text-muted-foreground whitespace-nowrap">
                  {line.batchNo?.trim() || "—"}
                </td>
                <td className="px-2 py-1.5 text-[12px] text-muted-foreground whitespace-nowrap">
                  {fmtDate(line.expiryDate)}
                </td>
                <td className="px-2 py-1.5 text-[12px] font-mono text-muted-foreground whitespace-nowrap">
                  {line.hsn?.trim() || "—"}
                </td>
                <td className="px-2 py-1.5 text-right">
                  {lockQty ? (
                    <span className="tabular-nums text-[12px]">{fmtQty(line.currentQty)}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      max={maxQty}
                      className={cn(
                        "h-[30px] w-16 text-xs text-right ml-auto font-normal",
                        overMax && "border-red-400",
                      )}
                      value={line.currentQty > 0 ? String(line.currentQty) : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          onCurrentQtyChange?.(line.id, 0);
                          return;
                        }
                        const v = parseFloat(raw);
                        onCurrentQtyChange?.(line.id, Number.isFinite(v) ? v : 0);
                      }}
                      aria-label={`${currentQtyLabel} for ${line.productName}`}
                    />
                  )}
                </td>
                <td className="px-2 py-1.5 text-[12px] text-muted-foreground">
                  {line.uom?.trim() || "—"}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[12px]">
                  {line.rate > 0 ? line.rate.toFixed(2) : "—"}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[12px]">
                  {formatMoney(line.taxable)}
                </td>
                <td className="px-2 py-1.5 text-right cn-gst-pct-cell">
                  {canEditGst ? (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      className="cn-gst-pct-input h-[30px] text-xs font-normal"
                      value={line.taxPct > 0 || line.taxPct === 0 ? String(line.taxPct) : ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          onTaxPctChange?.(line.id, 0);
                          return;
                        }
                        const v = parseFloat(raw);
                        onTaxPctChange?.(line.id, Number.isFinite(v) ? Math.max(0, v) : 0);
                      }}
                      aria-label={`GST % for ${line.productName}`}
                      inputMode="decimal"
                    />
                  ) : (
                    <span className="tabular-nums text-[12px]">
                      {line.taxPct > 0 ? `${line.taxPct}%` : "—"}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-muted-foreground">
                  {formatMoney(line.cgst)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-muted-foreground">
                  {formatMoney(line.sgst)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-muted-foreground">
                  {formatMoney(line.igst)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[12px] font-medium">
                  {formatMoney(line.lineTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
