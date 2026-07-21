/**
 * Ledger impact previews with resolved COA ledger names (demo-ready).
 */

import type { LedgerImpactLine } from "@/components/accounts/LedgerImpactPreview";
import {
  resolveMappingLedger,
  type LedgerMappingKey,
} from "@/lib/accounts/ledger-mappings";
import {
  gstLedgerLabelForRate,
  normalizeGstAmounts,
  type GstComponentAmounts,
} from "@/lib/accounts/gst-accounting";

function ledgerLabel(
  key: LedgerMappingKey,
  partyName?: string,
  fallback?: string,
  gstRatePct?: number,
): string {
  if (
    gstRatePct != null &&
    gstRatePct > 0 &&
    (key.startsWith("sales_") || key.startsWith("purchase_"))
  ) {
    if (key.includes("cgst") || key.includes("sgst") || key.includes("igst")) {
      return gstLedgerLabelForRate(key, gstRatePct);
    }
  }
  const ledger = resolveMappingLedger(key, partyName ?? "General", {
    createIfMissing: true,
    gstRatePct,
  });
  return ledger?.accountName ?? fallback ?? key;
}

function inferGstRateFromComponents(gst: GstComponentAmounts): number | undefined {
  if (gst.igst > 0) return Math.round(gst.igst * 100) / 100;
  if (gst.cgst > 0) return Math.round(gst.cgst * 2 * 100) / 100;
  return undefined;
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
  const gstRatePct = inferGstRateFromComponents(gst);

  const push = (
    key: LedgerMappingKey,
    amount: number,
    side: "debit" | "credit",
    note: string,
  ) => {
    if (amount <= 0) return;
    const ledger = ledgerLabel(key, undefined, note, gstRatePct);
    lines.push({
      ledger,
      debit: side === "debit" ? amount : undefined,
      credit: side === "credit" ? amount : undefined,
      note,
    });
  };

  if (isSalesOutput) {
    push("sales_cgst", gst.cgst, "credit", `Output CGST (GST ${gstRatePct ?? "?"}%)`);
    push("sales_sgst", gst.sgst, "credit", `Output SGST (GST ${gstRatePct ?? "?"}%)`);
    push("sales_igst", gst.igst, "credit", `Output IGST (GST ${gstRatePct ?? "?"}%)`);
  } else if (isCreditNote) {
    push("sales_cgst", gst.cgst, "debit", `Output CGST reversal (GST ${gstRatePct ?? "?"}%)`);
    push("sales_sgst", gst.sgst, "debit", `Output SGST reversal (GST ${gstRatePct ?? "?"}%)`);
    push("sales_igst", gst.igst, "debit", `Output IGST reversal (GST ${gstRatePct ?? "?"}%)`);
  } else if (isDebitNote) {
    push("purchase_cgst", gst.cgst, "credit", `Input CGST reversal (GST ${gstRatePct ?? "?"}%)`);
    push("purchase_sgst", gst.sgst, "credit", `Input SGST reversal (GST ${gstRatePct ?? "?"}%)`);
    push("purchase_igst", gst.igst, "credit", `Input IGST reversal (GST ${gstRatePct ?? "?"}%)`);
  } else {
    push("purchase_cgst", gst.cgst, "debit", `Input CGST (GST ${gstRatePct ?? "?"}%)`);
    push("purchase_sgst", gst.sgst, "debit", `Input SGST (GST ${gstRatePct ?? "?"}%)`);
    push("purchase_igst", gst.igst, "debit", `Input IGST (GST ${gstRatePct ?? "?"}%)`);
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

/** Sample Order Proforma — inventory consumption only (no receivable / revenue / GST). */
export function sampleOrderInventoryImpactResolved(inventoryValue: number): LedgerImpactLine[] {
  if (!(inventoryValue > 0)) return [];
  const expense = ledgerLabel(
    "sample_promotional_expense",
    "Sample / Promotional Expense",
    "Sample / Promotional Expense",
  );
  const inventory = ledgerLabel("stock_inventory", "General", "Inventory / Stock-in-Hand");
  return [
    {
      ledger: expense,
      debit: inventoryValue,
      note: "Sample / Promotional Expense Dr (at Cost Price)",
    },
    {
      ledger: inventory,
      credit: inventoryValue,
      note: "Inventory / Stock-in-Hand Cr",
    },
  ];
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
  lines.push({ ledger: vendorLedger, credit: input.grandTotal, note: "Supplier Cr — Sundry Creditor" });
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
  adjustmentLedgerName?: string;
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
  const creditLedger =
    input.adjustmentLedgerName ??
    ledgerLabel("purchase_inventory", "General", "Purchase Return / Adjustment");

  const lines: LedgerImpactLine[] = [
    { ledger: vendorLedger, debit: input.grandTotal, note: "Supplier Dr — Sundry Creditors" },
    { ledger: creditLedger, credit: input.taxable, note: "Adjustment ledger Cr" },
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

