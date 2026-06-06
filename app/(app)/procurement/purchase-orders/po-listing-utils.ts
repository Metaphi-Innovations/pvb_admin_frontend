import { getPOInvoiceListingStatus } from "./po-invoice-utils";
import type { PurchaseOrder } from "./po-data";
import { computeThreeWayMatch } from "@/lib/erp/three-way-match";
import type { ThreeWayMatchStatus } from "@/lib/erp/three-way-match";

export type POListingInvoiceStatus = "not_uploaded" | "uploaded";
export type POListingThreeWayMatchStatus = ThreeWayMatchStatus;

export function getPOListingInvoiceStatus(po: PurchaseOrder): POListingInvoiceStatus {
  return getPOInvoiceListingStatus(po);
}

export function getPOListingThreeWayMatchStatus(po: PurchaseOrder): POListingThreeWayMatchStatus {
  return computeThreeWayMatch(po).status;
}

export function getPOTotalItems(po: PurchaseOrder): number {
  return po.lines.filter((l) => l.productId > 0 || l.productName).length;
}

export function getVendorSecondaryLine(po: PurchaseOrder): string {
  if (po.supplierGstin?.trim()) return "GST Registered";
  return po.supplierType ? po.supplierType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}
