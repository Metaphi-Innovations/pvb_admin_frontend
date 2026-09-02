"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { InvoiceDetailField } from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import type { PendingCreditNoteDetail, SchemeTypeLedgerMapping } from "../credit-note-form-types";
import {
  formatCnMoney,
  formatPeriod,
  invoiceRefsOf,
  receiptRefsOf,
  returnRefsOf,
  snapshotStr,
  SOURCE_TYPE_LABELS,
  summaryValue,
  toNum,
} from "../credit-note-form-utils";

function Info({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <InvoiceDetailField label={label}>
      <div className={cn("so-goods-ro w-full min-w-0", mono && "font-mono text-brand-700")}>
        {value}
      </div>
    </InvoiceDetailField>
  );
}

function ContributingInvoices({ refs }: { refs: ReturnType<typeof invoiceRefsOf> }) {
  const [open, setOpen] = useState(false);
  if (!refs.length) return null;
  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        Contributing Invoices ({refs.length})
      </button>
      {open ? (
        <ul className="mt-1.5 max-h-40 overflow-y-auto rounded-md border border-border bg-muted/20 px-2 py-1.5 space-y-0.5">
          {refs.map((ref) => (
            <li key={`${ref.reference_id}-${ref.relation_type}`} className="text-[11px] font-mono text-brand-700">
              {ref.reference_code || ref.reference_id}
              {ref.reference_date ? (
                <span className="ml-2 font-sans text-muted-foreground">
                  {formatDisplayDate(ref.reference_date)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[10px] text-muted-foreground mt-1">
        Eligibility references only — not settlement allocations.
      </p>
    </div>
  );
}

export function CreditNoteSourceEntitlementSection({
  pending,
  sourceType,
  mappedLedgerName,
  schemeMapping,
}: {
  pending: PendingCreditNoteDetail | null;
  sourceType: string;
  mappedLedgerName?: string;
  schemeMapping?: SchemeTypeLedgerMapping | null;
}) {
  if (!pending || sourceType === "DIRECT" || sourceType === "SALES_INVOICE") return null;

  const invoices = invoiceRefsOf(pending);
  const receipts = receiptRefsOf(pending);
  const returns = returnRefsOf(pending);
  const scheme = pending.scheme;
  const summary = pending.calculation_summary;
  const customerGstin = snapshotStr(pending.customer_snapshot, "gstin_no", "gstin");
  const sourceLabel = SOURCE_TYPE_LABELS[sourceType] || sourceType;
  const ledgerName =
    mappedLedgerName ||
    schemeMapping?.ledger?.ledger_name ||
    "Resolved by backend on generate";

  const firstInvoice = invoices[0];
  const firstReturn = returns[0];
  const firstReceipt = receipts[0];
  const discountLabel =
    pending.discount_type === "Percentage"
      ? `${toNum(pending.discount_value)}%`
      : pending.discount_value != null
        ? formatCnMoney(pending.discount_value)
        : summaryValue(summary, "discount_rate", "discount_pct", "applied_slab") || "—";

  return (
    <VoucherFormSectionCard title="Source & Entitlement Details">
      <div className="so-invoice-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Source Type" value={sourceLabel} />
        {scheme ? (
          <>
            <Info
              label="Scheme"
              value={`${scheme.scheme_code ? `${scheme.scheme_code} · ` : ""}${scheme.scheme_name || ""}`}
              mono
            />
            <Info label="Scheme Type" value={scheme.scheme_type?.replaceAll("_", " ")} />
          </>
        ) : null}
        {sourceType === "SPECIAL_SCHEME" ? (
          <>
            <Info label="Scheme Period" value={formatPeriod(pending.eligibility_from, pending.eligibility_to)} />
            <Info label="Source Sales Invoice" value={firstInvoice?.reference_code} mono />
            <Info
              label="Eligibility basis"
              value={pending.calculation_basis || summaryValue(summary, "eligibility_basis", "basis")}
            />
            <Info
              label="Eligible Amount / Qty"
              value={
                toNum(pending.eligible_base_quantity) > 0
                  ? `${toNum(pending.eligible_base_quantity)} · ${formatCnMoney(pending.eligible_base_amount)}`
                  : formatCnMoney(pending.eligible_base_amount)
              }
            />
            <Info label="Discount Type" value={pending.discount_type || scheme?.discount_type} />
            <Info label="Discount Rate / Amount" value={discountLabel} />
            <Info label="Eligible CN Amount" value={formatCnMoney(pending.eligible_cn_amount)} />
          </>
        ) : null}
        {sourceType === "NEAR_EXPIRY" ? (
          <>
            <Info label="Source Invoice" value={firstInvoice?.reference_code} mono />
            <Info
              label="Expiry condition"
              value={
                summaryValue(summary, "expiry_condition", "expiry_rule", "near_expiry_days") ||
                formatPeriod(pending.eligibility_from, pending.eligibility_to)
              }
            />
            <Info label="Eligible CN Amount" value={formatCnMoney(pending.eligible_cn_amount)} />
          </>
        ) : null}
        {sourceType === "CASH_DISCOUNT" ? (
          <>
            <Info label="Sales Invoice" value={firstInvoice?.reference_code} mono />
            <Info label="Invoice Date" value={formatDisplayDate(firstInvoice?.reference_date)} />
            <Info label="Receipt reference" value={firstReceipt?.reference_code} mono />
            <Info
              label="Payment / Settlement Date"
              value={
                formatDisplayDate(firstReceipt?.reference_date) ||
                formatDisplayDate(summaryValue(summary, "payment_date", "settlement_date")) ||
                "—"
              }
            />
            <Info label="Payment Days" value={summaryValue(summary, "payment_days", "days") || "—"} />
            <Info
              label="Applied Slab"
              value={summaryValue(summary, "applied_slab", "slab", "slab_label") || "—"}
            />
            <Info label="Eligible Base" value={formatCnMoney(pending.eligible_base_amount)} />
            <Info label="Discount %" value={discountLabel} />
            <Info label="Eligible CN Amount" value={formatCnMoney(pending.eligible_cn_amount)} />
          </>
        ) : null}
        {sourceType === "TURNOVER_DISCOUNT" ? (
          <>
            <Info label="Scheme / eligibility period" value={formatPeriod(pending.eligibility_from, pending.eligibility_to)} />
            <Info
              label="Customer"
              value={pending.customer?.customer_name || snapshotStr(pending.customer_snapshot, "customer_name")}
            />
            <Info
              label="Calculation basis"
              value={pending.calculation_basis || summaryValue(summary, "calculation_basis", "basis")}
            />
            <Info
              label="Achieved turnover / eligible qty"
              value={
                toNum(pending.eligible_base_quantity) > 0
                  ? `${toNum(pending.eligible_base_quantity)}`
                  : formatCnMoney(pending.eligible_base_amount)
              }
            />
            <Info label="Target" value={summaryValue(summary, "target", "target_amount", "target_qty") || "—"} />
            <Info label="Discount rate / value" value={discountLabel} />
            <Info label="Eligible CN Amount" value={formatCnMoney(pending.eligible_cn_amount)} />
            <ContributingInvoices refs={invoices} />
          </>
        ) : null}
        {sourceType === "SALES_RETURN" ? (
          <>
            <Info label="Sales Return Number" value={firstReturn?.reference_code} mono />
            <Info label="Original Sales Invoice" value={firstInvoice?.reference_code} mono />
            <Info
              label="Customer"
              value={pending.customer?.customer_name || snapshotStr(pending.customer_snapshot, "customer_name")}
            />
            <Info
              label="Return Date"
              value={formatDisplayDate(firstReturn?.reference_date || pending.eligibility_date) || "—"}
            />
            <Info label="Eligible / approved CN amount" value={formatCnMoney(pending.eligible_cn_amount)} />
            {customerGstin ? <Info label="Customer GSTIN" value={customerGstin} mono /> : null}
          </>
        ) : null}
        {sourceType !== "SALES_RETURN" ? (
          <Info label="Supporting ledger" value={ledgerName} />
        ) : (
          <Info label="Sales ledger treatment" value={ledgerName} />
        )}
      </div>
    </VoucherFormSectionCard>
  );
}
