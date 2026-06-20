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

  postEmployeeClaim,

  postPurchaseInvoice,

  postSalesInvoice,

  postSalesInvoiceCogs,

  type PostingResult,

} from "@/lib/accounts/posting-engine";

import {

  aggregateLineGst,

  inferInterstateFromPlaceOfSupply,

  normalizeGstAmounts,

} from "@/lib/accounts/gst-accounting";



function taxableFromGrand(inv: { subtotal: number; discountTotal?: number; taxAmount: number; grandTotal: number }) {

  return Math.max(0, inv.grandTotal - inv.taxAmount);

}



export function maybePostSalesInvoice(invoice: InvoiceRecord): PostingResult | null {

  if (invoice.invoiceStatus === "cancelled") return null;

  const interstate = inferInterstateFromPlaceOfSupply(invoice.placeOfSupply);

  const tax = aggregateLineGst(

    invoice.lineItems.map((l) => ({

      qty: l.qty,

      unitPrice: l.unitPrice,

      discountPct: l.discountPct,

      taxPct: l.taxPct,

    })),

    interstate,

  );

  const revenueResult = postSalesInvoice({

    invoiceId: invoice.id,

    invoiceNo: invoice.invoiceNo,

    customerName: invoice.customerName,

    date: invoice.invoiceDate,

    taxableAmount: taxableFromGrand(invoice),

    ...tax,

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



export function maybePostPurchaseInvoice(invoice: PurchaseInvoiceRecord): PostingResult | null {

  const interstate = false;

  const tax = aggregateLineGst(

    invoice.lineItems.map((l) => ({

      qty: l.invoiceQty,

      unitPrice: l.unitPrice,

      discountPct: 0,

      taxPct: l.taxPct,

    })),

    interstate,

  );

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

  });

}



export function maybePostCreditNote(note: CreditNoteRecord): PostingResult | null {

  if (note.status !== "approved") return null;

  const interstate = inferInterstateFromPlaceOfSupply(
    (note as { placeOfSupply?: string }).placeOfSupply,
  );

  const taxAmount = note.taxCreditAmount ?? 0;

  const tax =

    note.lineItems?.length

      ? aggregateLineGst(

          note.lineItems.map((l) => ({

            qty: l.returnQty ?? 0,

            unitPrice: l.unitPrice ?? 0,

            discountPct: 0,

            taxPct: l.taxPct ?? 0,

          })),

          interstate,

        )

      : normalizeGstAmounts(taxAmount, interstate);

  const taxable = Math.max(0, note.currentCreditAmount - taxAmount);

  return postCreditNote({

    creditNoteId: note.id,

    creditNoteNo: note.creditNoteNo,

    customerName: note.customerName,

    date: note.creditNoteDate,

    taxableAmount: taxable,

    ...tax,

  });

}



export function maybePostDebitNote(note: DebitNoteRecord): PostingResult | null {

  if (note.status !== "approved") return null;

  const interstate = inferInterstateFromPlaceOfSupply(
    (note as { placeOfSupply?: string }).placeOfSupply,
  );

  const taxAmount = note.gstAmount ?? 0;

  const tax =

    note.lineItems?.length

      ? aggregateLineGst(

          note.lineItems.map((l) => ({

            qty: l.returnQty ?? 0,

            unitPrice: l.unitPrice ?? 0,

            discountPct: 0,

            taxPct: l.taxPct ?? 0,

          })),

          interstate,

        )

      : normalizeGstAmounts(taxAmount, interstate);

  return postDebitNote({

    debitNoteId: note.id,

    debitNoteNo: note.debitNoteNo,

    vendorName: note.vendorName,

    date: note.debitNoteDate,

    taxableAmount: note.taxableAmount ?? Math.max(0, note.currentDebitAmount - taxAmount),

    ...tax,

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


