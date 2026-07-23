"use client";

import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export interface VoucherSourceSummaryRow {
  label: string;
  value: string;
  mono?: boolean;
  tabular?: boolean;
}

export interface VoucherSourcePreviewLine {
  id: string;
  productName: string;
  /** Secondary lines under product name (SKU / Batch / MFG / Expiry). */
  productMeta?: string[];
  sku?: string;
  hsn?: string;
  batchNo?: string;
  quantity: number | null;
  uom?: string;
  basicAmount: number | null;
  gstPct: number | null;
  cgst: number;
  sgst: number;
  igst: number;
  totalAfterGst: number | null;
}

export interface VoucherSourceDocumentPreviewProps {
  visible?: boolean;
  summaryRows: VoucherSourceSummaryRow[];
  lines: VoucherSourcePreviewLine[];
  className?: string;
}

function SummaryCell({ row }: { row: VoucherSourceSummaryRow }) {
  const display = row.value?.trim() ? row.value : "—";
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[11px] font-medium text-muted-foreground">{row.label}</p>
      <p
        className={cn(
          "text-[12px] font-normal text-foreground truncate leading-snug",
          row.mono && "font-mono text-[11px] font-medium",
          row.tabular && "tabular-nums",
        )}
        title={display}
      >
        {display}
      </p>
    </div>
  );
}

function cellMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return formatMoney(value);
}

function cellQty(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || value <= 0) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * @deprecated Replaced by NoteReferenceDocumentDetails for Credit / Debit Note.
 * Read-only Source Document Preview — not used by active CN/DN routes.
 */
export function VoucherSourceDocumentPreview({
  visible = true,
  summaryRows,
  lines,
  className,
}: VoucherSourceDocumentPreviewProps) {
  if (!visible || summaryRows.length === 0) return null;

  return (
    <VoucherFormSectionCard
      title="Source Document Preview"
      helper="Read-only context from the selected invoice or return."
      className={className}
      flush={lines.length > 0}
      compact
    >
      <div className={cn(lines.length > 0 ? "px-3 py-2" : undefined)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2">
          {summaryRows.map((row) => (
            <SummaryCell key={row.label} row={row} />
          ))}
        </div>
      </div>

      {lines.length > 0 ? (
        <div className="border-t border-border/60 overflow-x-auto">
          <table className="w-full min-w-[720px] accounts-table">
            <thead>
              <tr className="accounts-table-head-row bg-muted/40 border-b border-border">
                <th className="accounts-table-th text-left">Product</th>
                <th className="accounts-table-th text-right">Qty</th>
                <th className="accounts-table-th text-right">Basic</th>
                <th className="accounts-table-th text-right">GST %</th>
                <th className="accounts-table-th text-right">CGST</th>
                <th className="accounts-table-th text-right">SGST</th>
                <th className="accounts-table-th text-right">IGST</th>
                <th className="accounts-table-th text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-border/40">
                  <td className="px-2 py-1 font-normal leading-snug whitespace-normal min-w-[160px]">
                    {line.productName || "—"}
                    <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                      {[
                        line.sku?.trim() ? `SKU ${line.sku.trim()}` : null,
                        line.hsn?.trim() ? `HSN ${line.hsn.trim()}` : null,
                        line.batchNo?.trim() ? `Batch ${line.batchNo.trim()}` : null,
                        line.uom?.trim() || null,
                        ...(line.productMeta ?? []),
                      ]
                        .filter(Boolean)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{cellQty(line.quantity)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {cellMoney(line.basicAmount)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {line.gstPct != null && line.gstPct > 0 ? `${line.gstPct}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                    {cellMoney(line.cgst)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                    {cellMoney(line.sgst)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                    {cellMoney(line.igst)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums font-normal">
                    {cellMoney(line.totalAfterGst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </VoucherFormSectionCard>
  );
}

/** Format money for summary rows. */
export function summaryMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return formatMoney(value);
}
