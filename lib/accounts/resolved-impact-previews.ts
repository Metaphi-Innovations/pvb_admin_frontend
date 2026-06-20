/**
 * Ledger impact previews with resolved COA ledger names (demo-ready).
 */

import type { LedgerImpactLine } from "@/components/accounts/LedgerImpactPreview";
import {
  resolveMappingLedger,
  type LedgerMappingKey,
} from "@/lib/accounts/ledger-mappings";
import {
  GST_LEDGER_NAMES,
  normalizeGstAmounts,
  type GstComponentAmounts,
} from "@/lib/accounts/gst-accounting";

function ledgerLabel(key: LedgerMappingKey, partyName?: string, fallback?: string): string {
  const ledger = resolveMappingLedger(key, partyName ?? "General", { createIfMissing: true });
  return ledger?.accountName ?? fallback ?? key;
}

/** @deprecated Use GstComponentAmounts from document lines instead */
export function splitTaxAmount(taxAmount: number, interstate = false): GstComponentAmounts {
  return normalizeGstAmounts(taxAmount, interstate);
}

function appendGstLines(
  lines: LedgerImpactLine[],
  gst: GstComponentAmounts,
  mode: "sales" | "purchase" | "credit_note" | "debit_note",
): void {
  const isSalesOutput = mode === "sales";
  const isCreditNote = mode === "credit_note";
  const isDebitNote = mode === "debit_note";

  const push = (
    key: LedgerMappingKey,
    amount: number,
    side: "debit" | "credit",
    label: string,
  ) => {
    if (amount <= 0) return;
    const ledger = ledgerLabel(key, undefined, label);
    lines.push({
      ledger,
      debit: side === "debit" ? amount : undefined,
      credit: side === "credit" ? amount : undefined,
      note: label,
    });
  };

  if (isSalesOutput) {
    push("sales_cgst", gst.cgst, "credit", `${GST_LEDGER_NAMES.cgstPayable} Cr`);
    push("sales_sgst", gst.sgst, "credit", `${GST_LEDGER_NAMES.sgstPayable} Cr`);
    push("sales_igst", gst.igst, "credit", `${GST_LEDGER_NAMES.igstPayable} Cr`);
  } else if (isCreditNote) {
    push("sales_cgst", gst.cgst, "debit", `${GST_LEDGER_NAMES.cgstPayable} Dr (reversal)`);
    push("sales_sgst", gst.sgst, "debit", `${GST_LEDGER_NAMES.sgstPayable} Dr (reversal)`);
    push("sales_igst", gst.igst, "debit", `${GST_LEDGER_NAMES.igstPayable} Dr (reversal)`);
  } else if (isDebitNote) {
    push("purchase_cgst", gst.cgst, "credit", `${GST_LEDGER_NAMES.cgstReceivable} Cr (reversal)`);
    push("purchase_sgst", gst.sgst, "credit", `${GST_LEDGER_NAMES.sgstReceivable} Cr (reversal)`);
    push("purchase_igst", gst.igst, "credit", `${GST_LEDGER_NAMES.igstReceivable} Cr (reversal)`);
  } else {
    push("purchase_cgst", gst.cgst, "debit", `${GST_LEDGER_NAMES.cgstReceivable} Dr`);
    push("purchase_sgst", gst.sgst, "debit", `${GST_LEDGER_NAMES.sgstReceivable} Dr`);
    push("purchase_igst", gst.igst, "debit", `${GST_LEDGER_NAMES.igstReceivable} Dr`);
  }
}

export function salesInvoiceImpactResolved(input: {
  customerName: string;
  taxable: number;
  taxAmount: number;
  grandTotal: number;
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

  const customerLedger = ledgerLabel("sales_receivable", input.customerName, input.customerName);
  const salesLedger = ledgerLabel("sales_revenue", "General", "Sales Revenue");

  const lines: LedgerImpactLine[] = [
    { ledger: customerLedger, debit: input.grandTotal, note: "Customer Dr — Sundry Debtor" },
    { ledger: salesLedger, credit: input.taxable, note: "Sales Revenue Cr" },
  ];
  appendGstLines(lines, gst, "sales");
  return lines;
}

export function purchaseInvoiceImpactResolved(input: {
  vendorName: string;
  taxable: number;
  taxAmount: number;
  grandTotal: number;
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

  const purchaseLedger = ledgerLabel("purchase_inventory", "Inventory / Stock-in-Hand", "Inventory / Purchase");
  const vendorLedger = ledgerLabel("purchase_payable", input.vendorName, input.vendorName);

  const lines: LedgerImpactLine[] = [
    { ledger: purchaseLedger, debit: input.taxable, note: "Inventory / Purchase Dr" },
  ];
  appendGstLines(lines, gst, "purchase");
  lines.push({ ledger: vendorLedger, credit: input.grandTotal, note: "Vendor Cr — Sundry Creditor" });
  return lines;
}

export function creditNoteImpactResolved(input: {
  customerName: string;
  taxable: number;
  taxAmount: number;
  grandTotal: number;
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

  const salesReturn = ledgerLabel("sales_revenue", "General", "Sales Return / Revenue");
  const customerLedger = ledgerLabel("sales_receivable", input.customerName, input.customerName);

  const lines: LedgerImpactLine[] = [
    { ledger: salesReturn, debit: input.taxable, note: "Sales return Dr — reverses revenue" },
  ];
  appendGstLines(lines, gst, "credit_note");
  lines.push({
    ledger: customerLedger,
    credit: input.grandTotal,
    note: "Customer Cr — reduces outstanding",
  });
  return lines;
}

export function debitNoteImpactResolved(input: {
  vendorName: string;
  taxable: number;
  taxAmount: number;
  grandTotal: number;
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

  const vendorLedger = ledgerLabel("purchase_payable", input.vendorName, input.vendorName);
  const purchaseReturn = ledgerLabel("purchase_inventory", "General", "Purchase Return");

  const lines: LedgerImpactLine[] = [
    { ledger: vendorLedger, debit: input.grandTotal, note: "Vendor Dr — reduces payable" },
    { ledger: purchaseReturn, credit: input.taxable, note: "Purchase / Inventory Cr — return" },
  ];
  appendGstLines(lines, gst, "debit_note");
  return lines;
}

export function stockOpeningImpactResolved(totalValue: number): LedgerImpactLine[] {
  const inventory = ledgerLabel("stock_inventory", "General", "Inventory / Stock-in-Hand");
  const opening = ledgerLabel("round_off", "General", "Opening Balance Adjustment");
  return [
    { ledger: inventory, debit: totalValue, note: "Inventory Dr — stock in hand" },
    { ledger: opening, credit: totalValue, note: "Opening balance Cr" },
  ];
}

export function claimApprovedImpactResolved(
  amount: number,
  expenseCategory = "Expense",
): LedgerImpactLine[] {
  return [
    {
      ledger: ledgerLabel("hr_claim_expense", expenseCategory, expenseCategory),
      debit: amount,
      note: "Expense Dr",
    },
    {
      ledger: ledgerLabel("hr_claim_payable", "Employee Payable", "Employee Payable"),
      credit: amount,
      note: "Employee Payable Cr",
    },
  ];
}

export function claimPaidImpactResolved(amount: number, bankLedgerName: string): LedgerImpactLine[] {
  return [
    {
      ledger: ledgerLabel("hr_claim_payable", "Employee Payable", "Employee Payable"),
      debit: amount,
      note: "Employee Payable Dr",
    },
    { ledger: bankLedgerName, credit: amount, note: "Bank Cr" },
  ];
}
