/**
 * Sales workflow — dispatch-ready records pending tax invoice creation in Accounts.
 */

import { listPendingDispatchInvoices } from "@/lib/accounts/dispatch-invoice-bridge";

export interface PendingTaxInvoiceRow {
  id: number;
  dispatchId: string;
  dispatchNo: string;
  soNumber: string;
  salesOrderId: number | null;
  customerName: string;
  dispatchDate: string;
  taxableValue: number;
  gstAmount: number;
  invoiceValue: number;
  status: string;
}

/** Pending invoices sourced from Warehouse dispatch (Delivered / In Transit / Partially Delivered). */
export function listPendingTaxInvoices(): PendingTaxInvoiceRow[] {
  return listPendingDispatchInvoices().map((row, index) => ({
    id: row.salesOrderId ?? index + 1,
    dispatchId: row.dispatchId,
    dispatchNo: row.dispatchNo,
    soNumber: row.soNumber,
    salesOrderId: row.salesOrderId,
    customerName: row.customerName,
    dispatchDate: row.dispatchDate,
    taxableValue: row.taxableValue,
    gstAmount: row.gstAmount,
    invoiceValue: row.invoiceValue,
    status: row.status,
  }));
}
