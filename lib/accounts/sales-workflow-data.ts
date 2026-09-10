/**
 * Sales workflow — pending tax invoice types.
 * Live Pending Invoices listing uses pendingInvoicesService (API).
 */

import type { InvoiceDocumentType } from "@/lib/accounts/invoice-type";

export interface PendingTaxInvoiceRow {
  id: number;
  dispatchId: string;
  dispatchNo: string;
  soNumber: string;
  salesOrderId: number | null;
  invoiceType: InvoiceDocumentType;
  customerName: string;
  dispatchDate: string;
  branch: string;
  taxableValue: number;
  gstAmount: number;
  invoiceValue: number;
  interstate?: boolean;
  status: string;
  schemeLabel: string | null;
  settlementLabel: string | null;
}

/** @deprecated Prefer pendingInvoicesService.list — demo/seed pipeline removed. */
export function listPendingTaxInvoices(): PendingTaxInvoiceRow[] {
  return [];
}
