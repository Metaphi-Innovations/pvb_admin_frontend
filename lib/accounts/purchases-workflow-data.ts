/**
 * Purchases workflow — GRN-completed receipts pending vendor bill in Accounts.
 */

import { getGrnRecords } from "@/app/(app)/warehouse/grnqc/grn/mock-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";

export interface PendingVendorBillRow {
  grnNo: string;
  poNumber: string;
  vendorName: string;
  grnDate: string;
  itemCount: number;
  status: string;
}

export function listPendingVendorBills(): PendingVendorBillRow[] {
  const billedGrns = new Set(
    loadPurchaseInvoices()
      .map((inv) => inv.grnNo?.trim())
      .filter(Boolean),
  );

  return getGrnRecords()
    .filter((g) => g.status === "qc_completed")
    .filter((g) => !billedGrns.has(g.grnNo))
    .map((g) => ({
      grnNo: g.grnNo,
      poNumber: g.poNumber,
      vendorName: g.vendorName,
      grnDate: g.grnDate,
      itemCount: g.items?.length ?? 0,
      status: g.status,
    }))
    .sort((a, b) => b.grnDate.localeCompare(a.grnDate));
}
