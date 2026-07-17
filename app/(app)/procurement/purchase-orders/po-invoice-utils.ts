import {
  listPurchaseInvoicesByPO,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import type { PurchaseOrder } from "./po-data";
import type { POListStatus } from "@/lib/procurement/po-status";

export type POInvoiceListingStatus = "not_uploaded" | "uploaded";

const UPLOADABLE_PO_STATUSES: POListStatus[] = [
  "approved",
  "invoice_uploaded",
  "partially_received",
  "received",
];

export function canUploadPOInvoiceForStatus(status: POListStatus): boolean {
  if (["cancelled", "short_closed", "closed"].includes(status)) return false;
  return UPLOADABLE_PO_STATUSES.includes(status);
}

export function canUploadPOInvoice(po: PurchaseOrder): boolean {
  return canUploadPOInvoiceForStatus(po.status);
}

export function getPOVendorInvoice(poId: string | number): PurchaseInvoiceRecord | null {
  const list = listPurchaseInvoicesByPO(poId as number);
  if (!list.length) return null;
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function getPOInvoiceListingStatus(po: PurchaseOrder): POInvoiceListingStatus {
  const inv = getPOVendorInvoice(po.id);
  if (inv || po.status === "invoice_uploaded" || po.status === "closed") return "uploaded";
  return "not_uploaded";
}

export function getPOInvoiceListingInfo(po: PurchaseOrder) {
  const inv = getPOVendorInvoice(po.id);
  return {
    status: getPOInvoiceListingStatus(po),
    vendorInvoiceNo: inv?.vendorInvoiceNo ?? null,
    vendorInvoiceDate: inv?.invoiceDate ?? null,
    purchaseRecordNo: inv?.invoiceNo ?? null,
    invoice: inv,
  };
}
