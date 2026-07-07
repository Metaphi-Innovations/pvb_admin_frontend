/**
 * Credit Note ledger impact preview and posting (customer CN only).
 */

import type { CreditNoteRecord } from "./credit-notes-data";
import type { LedgerImpactLine } from "@/components/accounts/LedgerImpactPreview";
import { getActivePostingLedgers } from "@/lib/accounts/coa-hierarchy";
import { resolveMappingLedger } from "@/lib/accounts/ledger-mappings";
import {
  aggregateLineGst,
  GST_LEDGER_NAMES,
  inferInterstateFromPlaceOfSupply,
  normalizeGstAmounts,
  type GstComponentAmounts,
} from "@/lib/accounts/gst-accounting";
import { postFromErpSource, type PostingLineInput, type PostingResult } from "@/lib/accounts/posting-engine";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

function findLedgerByHint(name: string): string | null {
  const ledgers = getActivePostingLedgers();
  const lower = name.trim().toLowerCase();
  const exact = ledgers.find((l) => l.accountName.toLowerCase() === lower);
  if (exact) return exact.accountName;
  const partial = ledgers.find((l) => l.accountName.toLowerCase().includes(lower));
  return partial?.accountName ?? null;
}

function findLedgerIdByName(name: string): number | null {
  const account = loadChartOfAccounts().find(
    (r) => r.nodeLevel === "ledger" && r.accountName === name,
  );
  return account?.id ?? null;
}

/** Scheme / sales-return debit ledger — never "General". */
export function resolveCreditNoteDiscountLedger(isSchemeSettlement: boolean): string {
  if (isSchemeSettlement) {
    return (
      findLedgerByHint("Scheme Discount") ??
      findLedgerByHint("Sales Promotion") ??
      findLedgerByHint("Dealer Promotion Expense") ??
      "Scheme Discount / Sales Promotion"
    );
  }
  const fromCoa = getActivePostingLedgers().find((l) =>
    l.accountName.toLowerCase().includes("sales return"),
  );
  if (fromCoa) return fromCoa.accountName;
  const mapped = resolveMappingLedger("sales_revenue", "Sales Return", { createIfMissing: false });
  return mapped?.accountName ?? "Sales Return";
}

export function resolveCreditNoteCustomerLedger(customerLedgerName: string, customerName: string): string {
  if (customerLedgerName.trim()) return customerLedgerName.trim();
  const mapped = resolveMappingLedger("sales_receivable", customerName, { createIfMissing: true });
  return mapped?.accountName ?? findLedgerByHint(customerName) ?? customerName;
}

function appendGstDebitLines(lines: LedgerImpactLine[], gst: GstComponentAmounts): void {
  if (gst.cgst > 0) {
    lines.push({
      ledger: GST_LEDGER_NAMES.cgstPayable,
      debit: gst.cgst,
      note: "Output CGST Dr (reversal)",
    });
  }
  if (gst.sgst > 0) {
    lines.push({
      ledger: GST_LEDGER_NAMES.sgstPayable,
      debit: gst.sgst,
      note: "Output SGST Dr (reversal)",
    });
  }
  if (gst.igst > 0) {
    lines.push({
      ledger: GST_LEDGER_NAMES.igstPayable,
      debit: gst.igst,
      note: "Output IGST Dr (reversal)",
    });
  }
}

export function buildCreditNoteLedgerImpact(input: {
  customerLedgerName: string;
  customerName: string;
  taxable: number;
  taxAmount: number;
  grandTotal: number;
  isSchemeSettlement?: boolean;
  isManualAdjustment?: boolean;
  adjustmentLedgerName?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  interstate?: boolean;
}): LedgerImpactLine[] {
  const gst: GstComponentAmounts =
    input.cgst != null || input.sgst != null || input.igst != null
      ? {
          cgst: input.cgst ?? 0,
          sgst: input.sgst ?? 0,
          igst: input.igst ?? 0,
        }
      : normalizeGstAmounts(input.taxAmount, input.interstate);

  const discountLedger =
    input.isManualAdjustment && input.adjustmentLedgerName?.trim()
      ? input.adjustmentLedgerName.trim()
      : resolveCreditNoteDiscountLedger(!!input.isSchemeSettlement);
  const customerLedger = resolveCreditNoteCustomerLedger(
    input.customerLedgerName,
    input.customerName,
  );

  const lines: LedgerImpactLine[] = [
    {
      ledger: discountLedger,
      debit: input.taxable,
      note: input.isManualAdjustment
        ? "Adjustment ledger Dr — discount / correction"
        : input.isSchemeSettlement
          ? "Scheme expense Dr — reduces sales value"
          : "Sales return Dr — reverses revenue",
    },
  ];
  appendGstDebitLines(lines, gst);
  lines.push({
    ledger: customerLedger,
    credit: input.grandTotal,
    note: "Customer Cr — reduces outstanding",
  });
  return lines;
}

export function postCreditNoteAccounting(note: CreditNoteRecord): PostingResult | null {
  if (note.status !== "approved") return null;

  const isScheme = Boolean(note.schemeSettlementKey) || note.source === "payment_discount_scheme";
  const isManual = note.source === "manual";
  const customerName = note.receivableLedger?.trim() || note.customerName;
  const interstate = inferInterstateFromPlaceOfSupply(
    (note as { placeOfSupply?: string }).placeOfSupply,
  );

  const tax =
    note.lineItems?.length > 0
      ? aggregateLineGst(
          note.lineItems.map((l) => ({
            qty: l.returnQty ?? 0,
            unitPrice: l.unitPrice ?? 0,
            discountPct: l.discountPct ?? 0,
            taxPct: l.taxPct ?? 0,
          })),
          interstate,
        )
      : normalizeGstAmounts(note.taxCreditAmount ?? 0, interstate);

  const taxable = Math.max(0, note.currentCreditAmount - (note.taxCreditAmount ?? 0));
  const total = note.currentCreditAmount;
  const discountLedgerName =
    isManual && note.adjustmentLedgerName?.trim()
      ? note.adjustmentLedgerName.trim()
      : resolveCreditNoteDiscountLedger(isScheme);
  const discountLedgerId =
    isManual && note.adjustmentLedgerId
      ? note.adjustmentLedgerId
      : findLedgerIdByName(discountLedgerName) ??
        getActivePostingLedgers().find((l) =>
          l.accountName.toLowerCase().includes(isScheme ? "promotion" : isManual ? "discount" : "sales return"),
        )?.id ??
        null;

  const customerLedgerName = resolveCreditNoteCustomerLedger(
    note.receivableLedger ?? "",
    note.customerName,
  );
  const customerLedger =
    resolveMappingLedger("sales_receivable", note.customerName, { createIfMissing: true }) ??
    loadChartOfAccounts().find((r) => r.accountName === customerLedgerName);

  const lines: PostingLineInput[] = [
    discountLedgerId
      ? {
          ledgerId: discountLedgerId,
          debit: taxable,
          credit: 0,
          remarks: isManual
            ? `Adjustment — ${note.reason || note.creditNoteNo}`
            : isScheme
              ? `Scheme discount — ${note.schemeCode ?? note.creditNoteNo}`
              : `Sales return — ${note.creditNoteNo}`,
        }
      : {
          mappingKey: "sales_revenue",
          partyName: "Sales Return",
          debit: taxable,
          credit: 0,
          remarks: `Sales return — ${note.creditNoteNo}`,
        },
    {
      mappingKey: "sales_receivable",
      partyName: note.customerName,
      ledgerId: customerLedger?.id,
      debit: 0,
      credit: total,
      remarks: `Reduce outstanding — ${customerName}`,
    },
  ];

  if (tax.cgst > 0) lines.push({ mappingKey: "sales_cgst", debit: tax.cgst, credit: 0 });
  if (tax.sgst > 0) lines.push({ mappingKey: "sales_sgst", debit: tax.sgst, credit: 0 });
  if (tax.igst > 0) lines.push({ mappingKey: "sales_igst", debit: tax.igst, credit: 0 });

  return postFromErpSource({
    sourceModule: "sales",
    sourceDocumentId: note.id,
    sourceDocumentNo: note.creditNoteNo,
    voucherType: "credit_note",
    date: note.creditNoteDate,
    narration: `Credit Note ${note.creditNoteNo} — ${note.customerName}`,
    lines,
  });
}
