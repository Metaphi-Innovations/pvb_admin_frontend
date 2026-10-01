import {
  listPurchaseInvoicesByPO,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import type { PurchaseOrder } from "./po-data";

export type POInvoiceListingStatus = "not_uploaded" | "uploaded";

export function getPOVendorInvoice(poId: number): PurchaseInvoiceRecord | null {
  const list = listPurchaseInvoicesByPO(poId);
  if (!list.length) return null;
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function canUploadPOInvoice(po: PurchaseOrder): boolean {
  if (["cancelled", "short_closed"].includes(po.status)) return false;
  return ["approved", "invoice_uploaded"].includes(po.status);
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
