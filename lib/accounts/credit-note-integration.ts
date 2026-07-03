/**
 * Auto-generate credit notes from sales returns and payment discount schemes.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { invalidateAccountsDataCache } from "@/lib/accounts/accounts-data-service";
import { loadConsolidatedSchemeRecords } from "@/app/(app)/masters/scheme/product-discount-scheme";
import type { SchemeRecord } from "@/app/(app)/masters/scheme/scheme-data";
import {
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadOrders } from "@/app/(app)/sales/orders/orders-data";
import { findInvoiceLinkedToOrder } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import type { SalesReturnRecord } from "@/app/(app)/sales/orders/sales-return-data";
import {
  approveCreditNote,
  buildReferenceFromInvoice,
  createCreditNote,
  getCreditNoteById,
  loadCreditNotes,
  normalizeCreditLine,
  recalcAllCreditLines,
  type CreditNoteRecord,
  type CreditNoteSource,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";

export interface PaymentDiscountCreditNoteResult {
  creditNote: CreditNoteRecord;
  message: string;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function findInvoiceForSalesReturn(ret: SalesReturnRecord): InvoiceRecord | undefined {
  const order = loadOrders().find((o) => o.soNumber === ret.salesOrderNumber);
  if (order) {
    const linked = findInvoiceLinkedToOrder(order.id);
    if (linked) return linked;
  }
  return loadInvoices().find(
    (inv) =>
      inv.invoiceStatus !== "cancelled" &&
      (inv.salesOrderNo === ret.salesOrderNumber ||
        inv.referenceNo === ret.salesOrderNumber ||
        inv.dispatchNo === ret.dispatchNumber),
  );
}

function matchProductLine(
  invoice: InvoiceRecord,
  productName: string,
  sku: string,
): (typeof invoice.lineItems)[number] | undefined {
  const key = productName.trim().toLowerCase();
  const skuKey = sku.trim().toLowerCase();
  return invoice.lineItems.find((l) => {
    const name = l.productName.trim().toLowerCase();
    if (skuKey && l.description?.toLowerCase().includes(skuKey)) return true;
    return name === key || name.includes(key) || key.includes(name);
  });
}

export function buildCreditNoteInputFromSalesReturn(
  ret: SalesReturnRecord,
  invoice: InvoiceRecord,
): Parameters<typeof createCreditNote>[0] | null {
  const preview = buildReferenceFromInvoice(invoice.id);
  if (!preview) return null;

  const lines = ret.products
    .map((p) => {
      const invLine = matchProductLine(invoice, p.product, p.sku);
      const baseLine = preview.lineItems.find((l) => l.sourceLineId === invLine?.id) ??
        preview.lineItems.find((l) =>
          l.productName.trim().toLowerCase() === p.product.trim().toLowerCase(),
        );
      if (!baseLine) return null;
      const returnQty = p.returnTotalPieces ?? p.returnQty ?? 0;
      if (returnQty <= 0) return null;
      return normalizeCreditLine({
        ...baseLine,
        returnQty,
        reason: ret.remarks || "Sales return",
      });
    })
    .filter((l): l is NonNullable<typeof l> => l != null);

  if (!lines.length) return null;

  const recalced = recalcAllCreditLines(lines, preview.alreadyAdjustedAmount);

  return {
    creditNoteDate: ret.returnDate,
    customerId: preview.customerId,
    customerName: preview.customerName || ret.customer,
    receivableLedger: preview.customerName,
    sourceInvoiceId: invoice.id,
    sourceInvoiceNo: invoice.invoiceNo,
    sourceOrderId: preview.sourceOrderId,
    sourceOrderNo: ret.salesOrderNumber,
    originalAmount: preview.originalAmount,
    alreadyAdjustedAmount: preview.alreadyAdjustedAmount,
    lineItems: recalced,
    reason: ret.remarks || "Sales return",
    remarks: `Auto-generated from Sales Return ${ret.returnNumber}`,
    status: "draft",
    source: "sales_return",
    sourceReturnId: ret.id,
    sourceReturnNo: ret.returnNumber,
  };
}

export function createCreditNoteFromSalesReturn(
  ret: SalesReturnRecord,
  autoApprove = true,
): CreditNoteRecord | null {
  if (ret.creditNoteId) {
    const existing = getCreditNoteById(Number(ret.creditNoteId));
    if (existing) return existing;
  }

  const existingByReturn = loadCreditNotes().find((cn) => cn.sourceReturnNo === ret.returnNumber);
  if (existingByReturn) return existingByReturn;

  const invoice = findInvoiceForSalesReturn(ret);
  if (!invoice) return null;

  const input = buildCreditNoteInputFromSalesReturn(ret, invoice);
  if (!input) return null;

  const cn = createCreditNote(input);
  if (autoApprove) {
    const approved = approveCreditNote(cn.id);
    invalidateAccountsDataCache("creditNotes");
    invalidateAccountsDataCache("invoices");
    return approved;
  }
  invalidateAccountsDataCache("creditNotes");
  return cn;
}

function isSchemeActiveForCustomer(scheme: SchemeRecord, invoice: InvoiceRecord): boolean {
  if (scheme.schemeType !== "Payment Discount Scheme") return false;
  if (scheme.approvalStatus !== "active" && scheme.status !== "active") return false;
  const today = new Date().toISOString().slice(0, 10);
  if (scheme.startDate && today < scheme.startDate) return false;
  if (scheme.endDate && today > scheme.endDate) return false;
  if (scheme.customerIds?.length) {
    const custCode = invoice.customerId ? `CUST-${String(invoice.customerId).padStart(3, "0")}` : "";
    const match = scheme.customerIds.some(
      (id) =>
        id === custCode ||
        id === String(invoice.customerId) ||
        invoice.customerName.toLowerCase().includes(id.toLowerCase()),
    );
    if (!match) return false;
  }
  return true;
}

function resolvePaymentDiscountPercent(scheme: SchemeRecord): number {
  if (scheme.paymentOfferBasis === "Discount / Waiver %" && scheme.waiverPercent) {
    return scheme.waiverPercent;
  }
  if (scheme.discountValue) return scheme.discountValue;
  if (scheme.waiverPercent) return scheme.waiverPercent;
  return 0;
}

export function findEligiblePaymentDiscountScheme(
  invoice: InvoiceRecord,
  paymentDate: string,
): SchemeRecord | null {
  const schemes = loadConsolidatedSchemeRecords().filter((s) =>
    isSchemeActiveForCustomer(s, invoice),
  );

  const daysFromInvoice = daysBetween(invoice.invoiceDate, paymentDate);

  for (const scheme of schemes) {
    if (scheme.paymentTiming === "Within X Days" && scheme.paymentWithinDays) {
      if (daysFromInvoice <= scheme.paymentWithinDays) return scheme;
    }
    if (scheme.isPaymentLevel && scheme.outstandingDays) {
      if (daysFromInvoice <= scheme.outstandingDays) return scheme;
    }
    if (!scheme.paymentTiming || scheme.paymentTiming === "Immediate") {
      if (daysFromInvoice <= 3) return scheme;
    }
  }
  return null;
}

export function createCreditNoteFromPaymentDiscount(
  invoice: InvoiceRecord,
  paymentDate: string,
  scheme: SchemeRecord,
  paymentAmount: number,
): PaymentDiscountCreditNoteResult | null {
  const alreadySettled = loadCreditNotes().some(
    (cn) =>
      cn.source === "payment_discount_scheme" &&
      cn.sourceInvoiceId === invoice.id &&
      cn.schemeCode === scheme.schemeCode &&
      cn.status === "approved",
  );
  if (alreadySettled) return null;

  const preview = buildReferenceFromInvoice(invoice.id);
  if (!preview) return null;

  const discountPct = resolvePaymentDiscountPercent(scheme);
  let discountAmount = 0;
  if (discountPct > 0) {
    discountAmount = Math.round(paymentAmount * (discountPct / 100) * 100) / 100;
  } else if (scheme.waiverAmount) {
    discountAmount = Math.min(scheme.waiverAmount, paymentAmount);
  }
  if (discountAmount <= 0) return null;

  const lines = preview.lineItems.length
    ? preview.lineItems.map((l, idx) =>
        normalizeCreditLine({
          ...l,
          returnQty: 0,
          creditAmount: idx === 0 ? discountAmount : 0,
          discountPct: discountPct > 0 ? discountPct : l.discountPct,
          description: `Payment discount — ${scheme.schemeName}`,
          reason: "Payment discount scheme",
        }),
      )
    : [
        normalizeCreditLine({
          id: `line-pd-${Date.now()}`,
          sourceLineId: "pd",
          productName: "Payment Discount",
          description: scheme.schemeName,
          invoiceQty: 1,
          unitPrice: discountAmount,
          discountPct: 0,
          taxPct: 18,
          gstAmount: 0,
          lineAmount: discountAmount,
          returnQty: 0,
          creditAmount: discountAmount,
          reason: "Payment discount scheme",
        }),
      ];

  const cn = createCreditNote({
    creditNoteDate: paymentDate,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    receivableLedger: invoice.customerName,
    sourceInvoiceId: invoice.id,
    sourceInvoiceNo: invoice.invoiceNo,
    sourceOrderId: invoice.salesOrderId ?? null,
    sourceOrderNo: invoice.salesOrderNo ?? invoice.referenceNo,
    originalAmount: preview.originalAmount,
    alreadyAdjustedAmount: preview.alreadyAdjustedAmount,
    lineItems: lines,
    reason: "Payment discount scheme",
    remarks: `Auto-generated — ${scheme.schemeName} (${discountPct || scheme.waiverAmount}% off)`,
    status: "draft",
    source: "payment_discount_scheme",
    schemeName: scheme.schemeName,
    schemeCode: scheme.schemeCode,
    discountPercent: discountPct || undefined,
    schemeSettlementAmount: discountAmount,
  });

  const approved = approveCreditNote(cn.id);
  invalidateAccountsDataCache("creditNotes");
  invalidateAccountsDataCache("invoices");

  return {
    creditNote: approved,
    message: "Payment Discount Applied Successfully. Credit Note Generated.",
  };
}

export function tryAutoCreditNoteOnPayment(
  invoiceId: number,
  paymentDate: string,
  paymentAmount: number,
): PaymentDiscountCreditNoteResult | null {
  const invoice = loadInvoices().find((i) => i.id === invoiceId);
  if (!invoice) return null;
  const scheme = findEligiblePaymentDiscountScheme(invoice, paymentDate);
  if (!scheme) return null;
  return createCreditNoteFromPaymentDiscount(invoice, paymentDate, scheme, paymentAmount);
}

export function inferCreditNoteSource(rec: Partial<CreditNoteRecord>): CreditNoteSource {
  if (rec.source) return rec.source;
  if (rec.sourceReturnNo) return "sales_return";
  if (rec.schemeSettlementKey || rec.schemeCode) return "payment_discount_scheme";
  return "manual";
}
