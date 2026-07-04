"use client";

import { cn } from "@/lib/utils";
import { formatLinkedInvoiceNos } from "./LinkedInvoicesMultiSelect";
import type { CreditNoteLine } from "../credit-notes-data";
import type { CreditNoteSettlementDetail } from "../scheme-pending-settlements";
import { CREDIT_NOTE_SOURCE_KIND_LABELS, type CreditNoteSourceKind } from "../credit-note-source-types";
import { formatINR } from "../note-utils";
import { CreditNoteProductTable } from "./CreditNoteProductTable";

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2.5 border-b border-border mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-medium mt-0.5", mono && "font-mono text-brand-700")}>{value ?? "—"}</p>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>;
}

export interface SettlementSummaryProps {
  sourceKind: CreditNoteSourceKind;
  settlementDetail: CreditNoteSettlementDetail | null;
  /** Product lines — only for sales return */
  lines?: CreditNoteLine[];
  readOnly?: boolean;
  onQtyChange?: (lineId: string, qty: number) => void;
}

export function SettlementSummary({
  sourceKind,
  settlementDetail,
  lines = [],
  readOnly,
  onQtyChange,
}: SettlementSummaryProps) {
  const detail = settlementDetail;

  return (
    <div className="px-6 py-5 border-b border-border/60 space-y-4">
      <SectionHeading label="Settlement Summary" />

      {!detail && sourceKind === "manual" && (
        <p className="text-xs text-muted-foreground">Direct adjustment — no settlement reference.</p>
      )}

      {!detail && sourceKind !== "manual" && (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">
          Select a pending record or reference document to load settlement details.
        </p>
      )}

      {detail?.kind === "sales_return" && (
        <div className="space-y-4">
          <InfoGrid>
            <Field label="Sales Return No." value={detail.salesReturnNo} mono />
            <Field label="Original Invoice" value={detail.originalInvoiceNo} mono />
            <Field label="Return Date" value={detail.returnDate} />
          </InfoGrid>
          {lines.length > 0 && onQtyChange && (
            <CreditNoteProductTable lines={lines} readOnly={readOnly} onQtyChange={onQtyChange} />
          )}
        </div>
      )}

      {detail?.kind === "cash_discount" && (
        <InfoGrid>
          <Field label="Scheme Name" value={detail.schemeName} />
          <Field label="Invoice Date" value={detail.invoiceDate} />
          <Field label="Payment Date" value={detail.paymentDate} />
          <Field label="Days Taken" value={String(detail.daysTaken)} />
          <Field label="Applicable Discount Slab" value={detail.applicableSlab} />
          <Field label="Discount %" value={`${detail.discountPercent}%`} />
          <Field label="Eligible Amount" value={formatINR(detail.eligibleAmount)} />
          <Field label="Linked Invoice(s)" value={formatLinkedInvoiceNos(detail.linkedInvoiceNos.map((no, i) => ({ id: detail.linkedInvoiceIds[i] ?? i, invoiceNo: no })))} mono />
        </InfoGrid>
      )}

      {detail?.kind === "near_expiry" && (
        <InfoGrid>
          <Field label="Scheme Name" value={detail.schemeName} />
          <Field label="Product" value={detail.product} />
          <Field label="Batch" value={detail.batch} mono />
          <Field label="Expiry Date" value={detail.expiryDate} />
          <Field label="Days Remaining" value={String(detail.daysRemaining)} />
          <Field label="Eligible Qty" value={String(detail.eligibleQty)} />
          <Field label="Discount %" value={`${detail.discountPercent}%`} />
          <Field label="Eligible Amount" value={formatINR(detail.eligibleAmount)} />
        </InfoGrid>
      )}

      {detail?.kind === "festive_scheme" && (
        <InfoGrid>
          <Field label="Scheme Name" value={detail.schemeName} />
          <Field label="Scheme Period" value={detail.schemePeriod} />
          <Field label="Target Qty" value={String(detail.targetQty)} />
          <Field label="Achieved Qty" value={String(detail.achievedQty)} />
          <Field label="Achievement %" value={`${detail.achievementPercent}%`} />
          <Field label="Discount %" value={`${detail.discountPercent}%`} />
          <Field label="Eligible Amount" value={formatINR(detail.eligibleAmount)} />
          <Field label="Linked Invoices" value={formatLinkedInvoiceNos(detail.linkedInvoiceNos.map((no, i) => ({ id: detail.linkedInvoiceIds[i] ?? i, invoiceNo: no })))} mono />
        </InfoGrid>
      )}

      {detail?.kind === "payment_discount" && (
        <InfoGrid>
          <Field label="Scheme Name" value={detail.schemeName} />
          <Field label="Invoice Date" value={detail.invoiceDate} />
          <Field label="Payment Date" value={detail.paymentDate} />
          <Field label="Credit Days" value={String(detail.creditDays)} />
          <Field label="Actual Days Taken" value={String(detail.actualDaysTaken)} />
          <Field label="Applicable Slab" value={detail.applicableSlab} />
          <Field label="Discount %" value={`${detail.discountPercent}%`} />
          <Field label="Eligible Amount" value={formatINR(detail.eligibleAmount)} />
          <Field label="Linked Invoice(s)" value={formatLinkedInvoiceNos(detail.linkedInvoiceNos.map((no, i) => ({ id: detail.linkedInvoiceIds[i] ?? i, invoiceNo: no })))} mono />
        </InfoGrid>
      )}

      {detail?.kind === "turnover_discount" && (
        <InfoGrid>
          <Field label="Scheme Name" value={detail.schemeName} />
          <Field label="Scheme Period" value={detail.schemePeriod} />
          <Field label="Target Turnover" value={formatINR(detail.targetTurnover)} />
          <Field label="Achieved Turnover" value={formatINR(detail.achievedTurnover)} />
          <Field label="Discount %" value={`${detail.discountPercent}%`} />
          <Field label="Eligible Amount" value={formatINR(detail.eligibleAmount)} />
          <Field label="Linked Invoices" value={formatLinkedInvoiceNos(detail.linkedInvoiceNos.map((no, i) => ({ id: detail.linkedInvoiceIds[i] ?? i, invoiceNo: no })))} mono />
        </InfoGrid>
      )}

      {sourceKind !== "manual" && detail && detail.kind !== "sales_return" && (
        <p className="text-[11px] text-muted-foreground">
          Source: {CREDIT_NOTE_SOURCE_KIND_LABELS[sourceKind]}
        </p>
      )}
    </div>
  );
}
