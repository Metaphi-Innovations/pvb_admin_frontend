import { getPurchaseInvoiceById } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import type { CompanyPaymentRecord } from "@/app/(app)/accounts/payments/payments-data";
import {
  getThreeWayMatchForPurchase,
  THREE_WAY_MATCH_LABELS,
  type ThreeWayMatchResult,
  type ThreeWayMatchStatus,
} from "./three-way-match";

export interface PurchasePaymentMatchContext {
  poNumber: string;
  vendorInvoiceNo: string;
  purchaseNo: string;
  matchStatus: ThreeWayMatchStatus;
  match: ThreeWayMatchResult | null;
}

export function getPurchasePaymentMatchContext(
  payment: CompanyPaymentRecord,
): PurchasePaymentMatchContext | null {
  if (payment.sourceType !== "purchase" || !payment.sourceDocumentId) return null;
  const purchase = getPurchaseInvoiceById(payment.sourceDocumentId);
  if (!purchase) return null;
  const match = getThreeWayMatchForPurchase(purchase);
  return {
    poNumber: purchase.poNumber || "—",
    vendorInvoiceNo: purchase.vendorInvoiceNo || "—",
    purchaseNo: purchase.invoiceNo || "—",
    matchStatus: match?.status ?? "pending",
    match,
  };
}

export function purchaseMatchWarning(status: ThreeWayMatchStatus): string | null {
  if (status === "mismatch") {
    return "3-Way Match status is Mismatch. Review PO, GRN, QC, and supplier invoice before processing payment.";
  }
  return null;
}

export { THREE_WAY_MATCH_LABELS };
