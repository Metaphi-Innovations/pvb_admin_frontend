/**
 * Wire ERP documents to the posting engine (localStorage demo).
 */

import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import type { PurchaseInvoiceRecord } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import type { CreditNoteRecord } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import type { DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import type { AccountExpense } from "@/app/(app)/accounts/expenses/expense-data";
import { getApprovedAmount } from "@/app/(app)/accounts/expenses/expense-data";
import {
  postCreditNote,
  postDebitNote,
  postDirectPurchaseInvoice,
  postEmployeeClaim,
  postPurchaseInvoice,
  postSalesInvoice,
  postSalesInvoiceCogs,
  type PostingResult,
} from "@/lib/accounts/posting-engine";
import {
  aggregateLineGst,
  aggregateLineGstByRate,
  inferInterstateFromPlaceOfSupply,
  normalizeGstAmounts,
} from "@/lib/accounts/gst-accounting";

function taxableFromGrand(inv: {
  subtotal: number;
  discountTotal?: number;
  taxAmount: number;
  grandTotal: number;
}) {
  return Math.max(0, inv.grandTotal - inv.taxAmount);
}

export function maybePostSalesInvoice(invoice: InvoiceRecord): PostingResult | null {
  if (invoice.invoiceStatus === "cancelled") return null;

  const interstate = inferInterstateFromPlaceOfSupply(invoice.placeOfSupply);
  const lineInputs = invoice.lineItems.map((l) => ({
    qty: l.qty,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    taxPct: l.taxPct,
  }));
  const gstBreakdowns = aggregateLineGstByRate(lineInputs, interstate);
  const tax = aggregateLineGst(lineInputs, interstate);

  const revenueResult = postSalesInvoice({
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    customerName: invoice.customerName,
    date: invoice.invoiceDate,
    grandTotal: invoice.grandTotal,
    taxableAmount: taxableFromGrand(invoice),
    ...tax,
    gstBreakdowns,
  });

  if (!revenueResult.success) return revenueResult;

  postSalesInvoiceCogs({
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    date: invoice.invoiceDate,
    lines: invoice.lineItems.map((l) => ({
      productName: l.productName,
      qty: l.qty,
    })),
  });

  return revenueResult;
}

function isDirectPurchaseRecord(invoice: PurchaseInvoiceRecord): boolean {
  if (invoice.sourceType === "direct_purchase") return true;
  return Boolean(invoice.directLines?.length) && !invoice.grnId?.trim();
}

function maybePostDirectPurchaseInvoice(invoice: PurchaseInvoiceRecord): PostingResult | null {
  const directLines = invoice.directLines ?? [];
  if (!directLines.length) return null;

  const cgst = invoice.cgstTotal ?? 0;
  const sgst = invoice.sgstTotal ?? 0;
  const igst = invoice.igstTotal ?? 0;
  const interstate = igst > 0 && cgst === 0 && sgst === 0;

  const lineInputs = directLines.map((dl) => ({
    qty: dl.quantity,
    unitPrice: dl.rate,
    discountPct: dl.grossAmount > 0 ? (dl.discount / dl.grossAmount) * 100 : 0,
    taxPct: dl.gstRate,
  }));
  const gstBreakdowns = aggregateLineGstByRate(lineInputs, interstate);

  return postDirectPurchaseInvoice({
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    vendorName: invoice.vendorName,
    date: invoice.postingDate ?? invoice.invoiceDate,
    expenseLines: directLines
      .filter((dl): dl is typeof dl & { expenseLedgerId: number } => dl.expenseLedgerId != null)
      .map((dl) => ({
        ledgerId: dl.expenseLedgerId,
        ledgerName: dl.expenseLedgerName,
        amount: dl.taxableAmount,
        description: dl.description,
      })),
    cgst,
    sgst,
    igst,
    gstBreakdowns,
    tdsAmount: invoice.tdsDeduction ?? 0,
    tdsMasterId: invoice.tdsSectionMasterId,
    tdsLedgerId: invoice.tdsLedgerId,
    roundOff: invoice.roundingAdjustment ?? 0,
  });
}

export function maybePostPurchaseInvoice(invoice: PurchaseInvoiceRecord): PostingResult | null {
  if (isDirectPurchaseRecord(invoice)) {
    return maybePostDirectPurchaseInvoice(invoice);
  }

  const interstate = false;
  const lineInputs = invoice.lineItems.map((l) => ({
    qty: l.invoiceQty,
    unitPrice: l.unitPrice,
    discountPct: 0,
    taxPct: l.taxPct,
  }));
  const gstBreakdowns = aggregateLineGstByRate(lineInputs, interstate);
  const tax = aggregateLineGst(lineInputs, interstate);

  if (tax.cgst === 0 && tax.sgst === 0 && tax.igst === 0 && invoice.taxAmount > 0) {
    Object.assign(tax, normalizeGstAmounts(invoice.taxAmount, interstate));
  }

  return postPurchaseInvoice({
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    vendorName: invoice.vendorName,
    date: invoice.invoiceDate,
    taxableAmount: invoice.subtotal || invoice.productAmount,
    ...tax,
    gstBreakdowns,
  });
}

export function maybePostCreditNote(note: CreditNoteRecord): PostingResult | null {
  if (note.status !== "approved") return null;

  const interstate = inferInterstateFromPlaceOfSupply(
    (note as { placeOfSupply?: string }).placeOfSupply,
  );
  const taxAmount = note.taxCreditAmount ?? 0;

  let gstBreakdowns;
  let tax;

  if (note.lineItems?.length) {
    const lineInputs = note.lineItems.map((l) => ({
      qty: l.returnQty ?? 0,
      unitPrice: l.unitPrice ?? 0,
      discountPct: 0,
      taxPct: l.taxPct ?? 0,
    }));
    gstBreakdowns = aggregateLineGstByRate(lineInputs, interstate);
    tax = aggregateLineGst(lineInputs, interstate);
  } else {
    tax = normalizeGstAmounts(taxAmount, interstate);
  }

  const taxable = Math.max(0, note.currentCreditAmount - taxAmount);

  return postCreditNote({
    creditNoteId: note.id,
    creditNoteNo: note.creditNoteNo,
    customerName: note.customerName,
    date: note.creditNoteDate,
    taxableAmount: taxable,
    ...tax,
    gstBreakdowns,
  });
}

export function maybePostDebitNote(note: DebitNoteRecord): PostingResult | null {
  if (note.status !== "approved" && note.status !== "posted") return null;

  const interstate = inferInterstateFromPlaceOfSupply(
    (note as { placeOfSupply?: string }).placeOfSupply,
  );
  const taxAmount = note.gstAmount ?? 0;

  let gstBreakdowns;
  let tax;

  if (note.lineItems?.length && note.againstType !== "standalone_adjustment") {
    const lineInputs = note.lineItems.map((l) => ({
      qty: l.returnQty ?? 0,
      unitPrice: l.unitPrice ?? 0,
      discountPct: 0,
      taxPct: l.taxPct ?? 0,
    }));
    gstBreakdowns = aggregateLineGstByRate(lineInputs, interstate);
    tax = aggregateLineGst(lineInputs, interstate);
  } else {
    tax = {
      cgst: note.cgstAmount ?? 0,
      sgst: note.sgstAmount ?? 0,
      igst: note.igstAmount ?? 0,
    };
    if (tax.cgst === 0 && tax.sgst === 0 && tax.igst === 0 && taxAmount > 0) {
      Object.assign(tax, normalizeGstAmounts(taxAmount, interstate));
    }
    if (note.freshGstPct && taxAmount > 0) {
      gstBreakdowns = [
        {
          ratePct: note.freshGstPct,
          cgst: tax.cgst,
          sgst: tax.sgst,
          igst: tax.igst,
        },
      ];
    }
  }

  return postDebitNote({
    debitNoteId: note.id,
    debitNoteNo: note.debitNoteNo,
    vendorName: note.vendorName,
    date: note.debitNoteDate,
    taxableAmount: note.taxableAmount ?? Math.max(0, note.currentDebitAmount - taxAmount),
    ...tax,
    gstBreakdowns,
    gstRatePct: note.freshGstPct,
    adjustmentLedgerId:
      note.againstType === "standalone_adjustment" ? note.adjustmentLedgerId ?? null : null,
    creditMappingKey:
      note.againstType === "standalone_adjustment" ? undefined : "purchase_inventory",
  });
}

export function maybePostEmployeeClaim(expense: AccountExpense): PostingResult | null {
  if (expense.status !== "approved") return null;

  const amount = getApprovedAmount(expense);
  if (amount <= 0) return null;

  return postEmployeeClaim({
    claimId: expense.id,
    claimNo: expense.sourceReferenceNo || expense.expenseNumber,
    employeeName: expense.employeeName,
    date: expense.expenseDate,
    amount,
  });
}
