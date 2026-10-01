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

function HeaderCell({
  label,
  value,
  mono,
  tabular,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tabular?: boolean;
}) {
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

function isInvoiceRef(type: NoteReferenceDocumentView["referenceType"]): boolean {
  return type === "sales_invoice" || type === "purchase_invoice";
}

function partyLabel(type: NoteReferenceDocumentView["referenceType"]): string {
  return type === "sales_invoice" || type === "sales_return" ? "Customer" : "Vendor";
}

function numberLabel(type: NoteReferenceDocumentView["referenceType"]): string {
  if (type === "sales_invoice" || type === "purchase_invoice") return "Invoice Number";
  return "Document Number";
}

function dateLabel(type: NoteReferenceDocumentView["referenceType"]): string {
  if (type === "sales_invoice" || type === "purchase_invoice") return "Invoice Date";
  return "Document Date";
}

/**
 * Compact read-only source document preview for Credit / Debit Note.
 * Invoice refs: Invoice Summary Preview. Returns: Reference Document Details.
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
      <VoucherFormSectionCard title="Invoice Summary Preview" compact className={className}>
        <p className="text-[12px] text-muted-foreground font-normal py-1">{emptyMessage}</p>
      </VoucherFormSectionCard>
    );
  }

  const invoice = isInvoiceRef(document.referenceType);
  const title = invoice ? "Invoice Summary Preview" : "Reference Document Details";
  const gstAmount = document.cgst + document.sgst + document.igst;

  return (
    <VoucherFormSectionCard
      title={title}
      compact
      flush={document.lines.length > 0}
      className={className}
    >
      <div className={cn(document.lines.length > 0 ? "px-3 py-1.5" : undefined)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-1.5">
          <HeaderCell
            label={numberLabel(document.referenceType)}
            value={document.documentNumber}
            mono
          />
          <HeaderCell
            label={dateLabel(document.referenceType)}
            value={document.documentDate}
          />
          <HeaderCell
            label={partyLabel(document.referenceType)}
            value={document.partyName}
          />
          <HeaderCell label="Subtotal" value={formatMoney(document.subTotal)} tabular />
          <HeaderCell label="GST Amount" value={formatMoney(gstAmount)} tabular />
          <HeaderCell label="Grand Total" value={formatMoney(document.grandTotal)} tabular />
        </div>
      </div>

      {document.lines.length > 0 ? (
        <div className="border-t border-border/60 overflow-x-auto">
          <table className="w-full min-w-[720px] accounts-table">
            <thead>
              <tr className="accounts-table-head-row bg-muted/40 border-b border-border">
                <th className="accounts-table-th text-left">Product</th>
                <th className="accounts-table-th text-right">
                  {invoice ? "Invoice Quantity" : "Source Qty"}
                </th>
                <th className="accounts-table-th text-left">UOM</th>
                <th className="accounts-table-th text-right">Rate</th>
                <th className="accounts-table-th text-right">GST %</th>
                <th className="accounts-table-th text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {document.lines.map((line) => (
                <tr key={line.id} className="border-b border-border/40">
                  <td className="px-2 py-1 min-w-[160px] max-w-[240px] whitespace-normal">
                    <p className="text-[12px] font-normal text-foreground leading-snug">
                      {line.productName || "—"}
                    </p>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                    {fmtQty(line.sourceQty)}
                  </td>
                  <td className="px-2 py-1 text-[12px] text-muted-foreground">
                    {line.uom?.trim() || "—"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                    {line.rate > 0 ? line.rate.toFixed(2) : "0.00"}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-[12px]">
                    {line.gstPct > 0 ? `${line.gstPct}%` : "—"}
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
