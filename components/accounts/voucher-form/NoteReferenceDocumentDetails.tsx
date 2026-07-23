"use client";

import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import type { NoteReferenceDocumentView } from "@/components/accounts/voucher-form/note-reference-model";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export interface NoteReferenceDocumentDetailsProps {
  document: NoteReferenceDocumentView | null;
  visible?: boolean;
  className?: string;
  emptyMessage?: string;
}

function fmtQty(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function HeaderCell({ label, value, mono, tabular }: { label: string; value: string; mono?: boolean; tabular?: boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-[12px] font-normal text-foreground truncate leading-snug",
          mono && "font-mono text-[11px]",
          tabular && "tabular-nums",
        )}
        title={value}
      >
        {value || "—"}
      </p>
    </div>
  );
}

/**
 * Single read-only Reference Document Details for Credit / Debit Note.
 * Used for Sales Invoice, Sales Return, Purchase Invoice, Purchase Return.
 */
export function NoteReferenceDocumentDetails({
  document,
  visible = true,
  className,
  emptyMessage = "Select a reference document to view source details.",
}: NoteReferenceDocumentDetailsProps) {
  if (!visible) return null;

  if (!document) {
    return (
      <VoucherFormSectionCard title="Reference Document Details" compact className={className}>
        <p className="text-[12px] text-muted-foreground font-normal py-1">{emptyMessage}</p>
      </VoucherFormSectionCard>
    );
  }

  return (
    <VoucherFormSectionCard
      title="Reference Document Details"
      compact
      flush={document.lines.length > 0}
      className={className}
    >
      <div className={cn(document.lines.length > 0 ? "px-3 py-2" : undefined)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-2">
          <HeaderCell label="Reference Type" value={document.referenceTypeLabel} />
          <HeaderCell label="Document Number" value={document.documentNumber} mono />
          <HeaderCell label="Document Date" value={document.documentDate} />
          <HeaderCell label="Party Name" value={document.partyName} />
          <HeaderCell label="Sub Total / Basic" value={formatMoney(document.subTotal)} tabular />
          <HeaderCell label="CGST" value={formatMoney(document.cgst)} tabular />
          <HeaderCell label="SGST" value={formatMoney(document.sgst)} tabular />
          <HeaderCell label="IGST" value={formatMoney(document.igst)} tabular />
          <HeaderCell label="Grand Total" value={formatMoney(document.grandTotal)} tabular />
        </div>
      </div>

      {document.lines.length > 0 ? (
        <div className="border-t border-border/60 overflow-x-auto">
          <table className="w-full min-w-[980px] accounts-table">
            <thead>
              <tr className="accounts-table-head-row bg-muted/40 border-b border-border">
                <th className="accounts-table-th text-left">Product Details</th>
                <th className="accounts-table-th text-left">HSN / SAC</th>
                <th className="accounts-table-th text-left">Batch</th>
                <th className="accounts-table-th text-right">Source Qty</th>
                <th className="accounts-table-th text-left">UOM</th>
                <th className="accounts-table-th text-right">Rate</th>
                <th className="accounts-table-th text-right">Basic Amount</th>
                <th className="accounts-table-th text-right">GST %</th>
                <th className="accounts-table-th text-right">CGST</th>
                <th className="accounts-table-th text-right">SGST</th>
                <th className="accounts-table-th text-right">IGST</th>
                <th className="accounts-table-th text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {document.lines.map((line) => (
                <tr key={line.id} className="border-b border-border/40">
                  <td className="px-2 py-1 min-w-[160px] max-w-[220px] whitespace-normal">
                    <p className="text-[12px] font-normal text-foreground leading-snug">
                      {line.productName || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5 leading-tight">
                      SKU: {line.sku?.trim() || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-normal leading-tight">
                      MFG: {line.mfgDate?.trim() || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-normal leading-tight">
                      Expiry: {line.expiryDate?.trim() || "—"}
                    </p>
                  </td>
                  <td className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {line.hsn?.trim() || "—"}
                  </td>
                  <td className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
                    {line.batchNo?.trim() || "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px]">{fmtQty(line.sourceQty)}</td>
                  <td className="px-2 py-1 text-[12px] text-muted-foreground">{line.uom?.trim() || "—"}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                    {line.rate > 0 ? line.rate.toFixed(2) : "0.00"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                    {formatMoney(line.basicAmount)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                    {line.gstPct > 0 ? `${line.gstPct}%` : "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px] text-muted-foreground">
                    {formatMoney(line.cgst)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px] text-muted-foreground">
                    {formatMoney(line.sgst)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px] text-muted-foreground">
                    {formatMoney(line.igst)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px] font-normal">
                    {formatMoney(line.lineTotal)}
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
