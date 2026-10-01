import type { PurchaseInvoiceRecord } from "./purchase-invoices-data";

/** Removed slim-seed demo invoice numbers — pruned on merge. */
export const PURCHASE_INVOICE_LEGACY_DEMO_NOS = new Set([
  "PUR-DEMO-003",
  "PUR-DEMO-004",
  "PUR-DEMO-005",
  "PUR-DP-003",
  "PUR-DP-004",
  "PUR-DP-005",
  "PUR-DP-006",
  "PUR-DP-007",
  "PUR-DP-008",
  "PUR-DP-009",
  "PUR-DP-010",
]);

export const CANONICAL_GRN_DEMO_NOS = new Set(["PUR-DEMO-001", "PUR-DEMO-002"]);
export const CANONICAL_DIRECT_DEMO_NOS = new Set(["PUR-DP-001", "PUR-DP-002"]);

export function pruneStalePurchaseInvoiceDemos(existing: PurchaseInvoiceRecord[]): PurchaseInvoiceRecord[] {
  return existing.filter((i) => {
    if (PURCHASE_INVOICE_LEGACY_DEMO_NOS.has(i.invoiceNo)) return false;
    if (i.invoiceNo.startsWith("PUR-DEMO-") && !CANONICAL_GRN_DEMO_NOS.has(i.invoiceNo)) return false;
    if (i.invoiceNo.startsWith("PUR-DP-") && !CANONICAL_DIRECT_DEMO_NOS.has(i.invoiceNo)) return false;
    return true;
  });
}
