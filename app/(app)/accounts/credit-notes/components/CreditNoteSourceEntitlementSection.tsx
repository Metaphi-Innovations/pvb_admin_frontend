"use client";

import { useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
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
import {
  CreditNoteInvoiceDetailsModal,
  type InvoiceRefSummary,
} from "./CreditNoteInvoiceDetailsModal";

function SummaryItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-background/60 border border-border/40 hover:border-border/80 transition-colors">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div
        className={`text-xs font-semibold text-foreground break-words ${
          mono ? "font-mono text-brand-700" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ContributingInvoicesHorizontal({
  refs,
}: {
  refs: ReturnType<typeof invoiceRefsOf>;
}) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRefSummary | null>(null);

  if (!refs.length) return null;

  return (
    <div className="mt-4 pt-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-brand-600" />
          Contributing Invoices ({refs.length})
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {refs.map((ref) => {
          const invCode = ref.reference_code || ref.reference_id;
          return (
            <button
              key={`${ref.reference_id}-${ref.relation_type}`}
              type="button"
              onClick={() =>
                setSelectedInvoice({
                  reference_id: ref.reference_id,
                  reference_code: ref.reference_code,
                  reference_date: ref.reference_date,
                  eligible_amount: ref.eligible_amount,
                })
              }
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-muted/60 hover:bg-brand-50 hover:text-brand-700 text-foreground border border-border/70 hover:border-brand-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
              title={`Click to view details for ${invCode}`}
            >
              <span className="text-brand-700 font-semibold group-hover:text-brand-800">
                {invCode}
              </span>
              {ref.reference_date ? (
                <span className="text-[10px] font-sans text-muted-foreground group-hover:text-brand-600/80">
                  ({formatDisplayDate(ref.reference_date)})
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Eligibility references only — not settlement allocations.
      </p>

      <CreditNoteInvoiceDetailsModal
        open={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        invoiceRef={selectedInvoice}
      />
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
    pending.lines?.[0]?.ledger?.ledger_name ||
    snapshotStr(pending.lines?.[0]?.ledger_snapshot, "ledger_name") ||
    "";

  const firstInvoice = invoices[0];
  const firstReturn = returns[0];
  const firstReceipt = receipts[0];
  const discountLabel =
    String(pending.discount_type).toUpperCase() === "PERCENTAGE"
      ? `${toNum(pending.discount_value)}%`
      : pending.discount_value != null
        ? formatCnMoney(pending.discount_value)
        : summaryValue(summary, "discount_rate", "discount_pct", "applied_slab") || "—";

  const discountPercentage = (() => {
    const summaryPct = summaryValue(summary, "discount_percentage", "discount_pct", "discount_rate");
    if (summaryPct && summaryPct !== "—") {
      return summaryPct.endsWith("%") ? summaryPct : `${summaryPct}%`;
    }
    if (summary && typeof summary === "object" && "achieved_slab" in summary) {
      const slabVal = (summary as any).achieved_slab?.discount_value;
      if (slabVal != null && toNum(slabVal) > 0) {
        return `${toNum(slabVal)}%`;
      }
    }
    if (String(pending.discount_type).toUpperCase() === "PERCENTAGE" && toNum(pending.discount_value) > 0) {
      return `${toNum(pending.discount_value)}%`;
    }
    const lineWithPct = pending.lines?.find(
      (l) => String(l.discount_type).toUpperCase() === "PERCENTAGE" && toNum(l.discount_value) > 0,
    );
    if (lineWithPct) {
      return `${toNum(lineWithPct.discount_value)}%`;
    }
    const descText = pending.lines?.[0]?.description || pending.remarks || "";
    const match = descText.match(/\((\d+(?:\.\d+)?%)\)/) || descText.match(/(\d+(?:\.\d+)?%)/);
    if (match) {
      return match[1].endsWith("%") ? match[1] : `${match[1]}%`;
    }
    return discountLabel;
  })();

  return (
    <VoucherFormSectionCard title="Source & Entitlement Details">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          <SummaryItem label="Source Type" value={sourceLabel} />
          {scheme ? (
            <>
              <SummaryItem
                label="Scheme"
                value={`${scheme.scheme_code ? `${scheme.scheme_code} · ` : ""}${scheme.scheme_name || ""}`}
                mono
              />
              <SummaryItem label="Scheme Type" value={scheme.scheme_type?.replaceAll("_", " ")} />
            </>
          ) : null}

          {sourceType === "TURNOVER_DISCOUNT" ? (
            <>
              <SummaryItem
                label="Eligibility Period"
                value={formatPeriod(pending.eligibility_from, pending.eligibility_to)}
              />
              <SummaryItem
                label="Customer"
                value={pending.customer?.customer_name || snapshotStr(pending.customer_snapshot, "customer_name")}
              />
              <SummaryItem
                label="Calculation Basis"
                value={pending.calculation_basis || summaryValue(summary, "calculation_basis", "basis")}
              />
              <SummaryItem
                label="Achieved Turnover"
                value={
                  toNum(pending.eligible_base_quantity) > 0
                    ? `${toNum(pending.eligible_base_quantity)}`
                    : formatCnMoney(pending.eligible_base_amount)
                }
              />
              {summaryValue(summary, "target", "target_amount", "target_qty") ? (
                <SummaryItem
                  label="Target"
                  value={summaryValue(summary, "target", "target_amount", "target_qty")}
                />
              ) : null}
              <SummaryItem label="Discount" value={discountPercentage} />
              <SummaryItem
                label="Eligible CN Amount"
                value={formatCnMoney(pending.eligible_cn_amount)}
                mono
              />
            </>
          ) : null}

          {sourceType === "SPECIAL_SCHEME" ? (
            <>
              <SummaryItem
                label="Scheme Period"
                value={formatPeriod(pending.eligibility_from, pending.eligibility_to)}
              />
              <SummaryItem label="Source Sales Invoice" value={firstInvoice?.reference_code} mono />
              <SummaryItem
                label="Eligibility Basis"
                value={pending.calculation_basis || summaryValue(summary, "eligibility_basis", "basis")}
              />
              <SummaryItem
                label="Eligible Base"
                value={
                  toNum(pending.eligible_base_quantity) > 0
                    ? `${toNum(pending.eligible_base_quantity)} · ${formatCnMoney(pending.eligible_base_amount)}`
                    : formatCnMoney(pending.eligible_base_amount)
                }
              />
              <SummaryItem label="Discount Type" value={pending.discount_type || scheme?.discount_type} />
              <SummaryItem label="Discount Percentage" value={discountPercentage} />
              <SummaryItem
                label="Eligible CN Amount"
                value={formatCnMoney(pending.eligible_cn_amount)}
                mono
              />
            </>
          ) : null}

          {sourceType === "NEAR_EXPIRY" ? (
            <>
              <SummaryItem label="Source Invoice" value={firstInvoice?.reference_code} mono />
              <SummaryItem
                label="Expiry Condition"
                value={
                  summaryValue(summary, "expiry_condition", "expiry_rule", "near_expiry_days") ||
                  formatPeriod(pending.eligibility_from, pending.eligibility_to)
                }
              />
              <SummaryItem
                label="Eligible CN Amount"
                value={formatCnMoney(pending.eligible_cn_amount)}
                mono
              />
            </>
          ) : null}

          {sourceType === "CASH_DISCOUNT" ? (
            <>
              <SummaryItem label="Sales Invoice" value={firstInvoice?.reference_code} mono />
              <SummaryItem label="Invoice Date" value={formatDisplayDate(firstInvoice?.reference_date)} />
              <SummaryItem label="Receipt Reference" value={firstReceipt?.reference_code} mono />
              <SummaryItem
                label="Payment / Settlement Date"
                value={
                  formatDisplayDate(firstReceipt?.reference_date) ||
                  formatDisplayDate(summaryValue(summary, "payment_date", "settlement_date")) ||
                  "—"
                }
              />
              <SummaryItem label="Payment Days" value={summaryValue(summary, "payment_days", "days")} />
              <SummaryItem
                label="Applied Slab"
                value={summaryValue(summary, "applied_slab", "slab", "slab_label")}
              />
              <SummaryItem label="Eligible Base" value={formatCnMoney(pending.eligible_base_amount)} />
              <SummaryItem label="Discount Percentage" value={discountPercentage} />
              <SummaryItem
                label="Eligible CN Amount"
                value={formatCnMoney(pending.eligible_cn_amount)}
                mono
              />
            </>
          ) : null}

          {sourceType === "SALES_RETURN" ? (
            <>
              <SummaryItem label="Sales Return Number" value={firstReturn?.reference_code} mono />
              <SummaryItem label="Original Sales Invoice" value={firstInvoice?.reference_code} mono />
              <SummaryItem
                label="Customer"
                value={pending.customer?.customer_name || snapshotStr(pending.customer_snapshot, "customer_name")}
              />
              <SummaryItem
                label="Return Date"
                value={formatDisplayDate(firstReturn?.reference_date || pending.eligibility_date)}
              />
              <SummaryItem
                label="Eligible / Approved CN Amount"
                value={formatCnMoney(pending.eligible_cn_amount)}
                mono
              />
              {customerGstin ? <SummaryItem label="Customer GSTIN" value={customerGstin} mono /> : null}
            </>
          ) : null}

          {sourceType !== "SALES_RETURN" ? (
            ledgerName ? <SummaryItem label="Supporting Ledger" value={ledgerName} /> : null
          ) : (
            <SummaryItem label="Sales Ledger Treatment" value={ledgerName || "Sales Account"} />
          )}
        </div>

        {/* Contributing Invoices horizontal pill list */}
        {invoices.length > 0 ? <ContributingInvoicesHorizontal refs={invoices} /> : null}
      </div>
    </VoucherFormSectionCard>
  );
}

