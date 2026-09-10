/**
 * Sales invoice seed helpers — demo seed retired.
 * Transactions → Sales Invoice listing/create uses the API.
 */

import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";

export const SALES_INVOICE_SEED_VERSION = 11;

export function buildSalesInvoiceSeed(): InvoiceRecord[] {
  return [];
}

/** @deprecated Empty — seed pipeline removed. */
export const SALES_INVOICE_SEED: InvoiceRecord[] = [];

export function mergeSalesInvoiceSeed(records: InvoiceRecord[]): InvoiceRecord[] {
  return records;
}
