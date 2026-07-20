import { getPOInvoiceListingStatus } from "./po-invoice-utils";
import type { PurchaseOrder } from "./po-data";
import { computeThreeWayMatch } from "@/lib/erp/three-way-match";
import type { ThreeWayMatchStatus } from "@/lib/erp/three-way-match";

export type POListingInvoiceStatus = "not_uploaded" | "uploaded";
export type POListingThreeWayMatchStatus = ThreeWayMatchStatus;

export function getPOListingInvoiceStatus(
  po: PurchaseOrder,
): POListingInvoiceStatus {
  return getPOInvoiceListingStatus(po);
}

export function getPOListingThreeWayMatchStatus(
  po: PurchaseOrder,
): POListingThreeWayMatchStatus {
  return computeThreeWayMatch(po).status;
}

export function getPOTotalItems(po: PurchaseOrder): number {
  return po.lines.filter((l) => Boolean(l.productId) || Boolean(l.productName))
    .length;
}

export function getPOTotalSkuQty(po: PurchaseOrder): number {
  return po.lines.reduce((sum, l) => sum + (l.orderedQty || 0), 0);
}

export function getPOTotalAmount(po: PurchaseOrder): number {
  return po.summary?.productTotal ?? po.summary?.taxableValue ?? 0;
}

export function getVendorSecondaryLine(po: PurchaseOrder): string {
  if (po.supplierGstin?.trim()) return "GST Registered";
  return po.supplierType
    ? po.supplierType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
}

export const PURCHASE_ORDER_LIST_HREF = "/procurement/purchase-orders";

export type PurchaseOrderListTab = "all" | "draft" | "po_return";

export function purchaseOrderListHref(tab: PurchaseOrderListTab = "all"): string {
  if (tab === "all") return PURCHASE_ORDER_LIST_HREF;
  return `${PURCHASE_ORDER_LIST_HREF}?tab=${tab}`;
}

export function purchaseOrderListHrefWithToast(
  toast: string,
  tab: PurchaseOrderListTab = "all",
): string {
  const href = purchaseOrderListHref(tab);
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}toast=${encodeURIComponent(toast)}`;
}
