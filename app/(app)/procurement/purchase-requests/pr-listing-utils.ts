import { PROCUREMENT_APPROVER } from "@/lib/procurement/config";
import type { PurchaseRequest } from "./pr-data";
import { calcPrLineAmount } from "@/lib/procurement/procurement-line-utils";

export type PRApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";
export type PRPoConversionStatus = "not_created" | "partially_converted" | "fully_converted";

export function getPRApprovalStatus(pr: PurchaseRequest): PRApprovalStatus {
  if (["draft", "pending_approval", "approved", "rejected"].includes(pr.status)) {
    return pr.status as PRApprovalStatus;
  }
  return "approved";
}

export function getPRPoConversionStatus(pr: PurchaseRequest): PRPoConversionStatus {
  if (pr.status === "fully_converted") return "fully_converted";
  if (pr.status === "partially_converted" || pr.convertedPoIds.length > 0) return "partially_converted";
  return "not_created";
}

export function getPRTotalItems(pr: PurchaseRequest): number {
  return pr.lines.filter((l) => (Boolean(l.productId) && l.productId !== 0 && l.productId !== "0") || l.productName).length;
}

export function getPRTotalQuantity(pr: PurchaseRequest): number {
  return pr.lines.reduce((s, l) => s + (l.totalQtyBase || 0), 0);
}

export function getPRTotalAmount(pr: PurchaseRequest): number {
  return pr.lines.reduce(
    (s, l) => s + calcPrLineAmount(l.ratePerSku ?? 0, l.totalQtyBase ?? 0),
    0,
  );
}

export function getPRCurrentApprover(pr: PurchaseRequest): string {
  if (getPRApprovalStatus(pr) === "pending_approval") return PROCUREMENT_APPROVER;
  return "—";
}
