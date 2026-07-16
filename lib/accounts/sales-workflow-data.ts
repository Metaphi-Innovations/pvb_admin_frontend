/**
 * Sales workflow — dispatch-ready records pending tax invoice creation in Accounts.
 */

import { listPendingDispatchInvoices } from "@/lib/accounts/dispatch-invoice-bridge";
import type { InvoiceDocumentType } from "@/lib/accounts/invoice-type";
import { listPendingInvoiceSeedRows } from "@/lib/accounts/pending-invoice-seed";

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

/** Pending invoices sourced from Warehouse dispatch (Delivered / In Transit / Partially Delivered). */
export function listPendingTaxInvoices(): PendingTaxInvoiceRow[] {
  const seedRows = listPendingInvoiceSeedRows();
  const seedIds = new Set(seedRows.map((r) => r.dispatchId));
  const warehouseRows = listPendingDispatchInvoices()
    .filter((r) => !seedIds.has(r.dispatchId))
    .map((row, index) => ({
      id: row.salesOrderId ?? seedRows.length + index + 1,
      dispatchId: row.dispatchId,
      dispatchNo: row.dispatchNo,
      soNumber: row.soNumber,
      salesOrderId: row.salesOrderId,
      invoiceType: row.invoiceType,
      customerName: row.customerName,
      dispatchDate: row.dispatchDate,
      branch: row.warehouse,
      taxableValue: row.taxableValue,
      gstAmount: row.gstAmount,
      invoiceValue: row.invoiceValue,
      interstate: row.interstate,
      status: row.status,
      schemeLabel: row.schemeLabel,
      settlementLabel: row.settlementLabel,
    }));
  return [...seedRows, ...warehouseRows].sort((a, b) => b.dispatchDate.localeCompare(a.dispatchDate));
}
