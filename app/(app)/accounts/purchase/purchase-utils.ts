export const PURCHASE_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Purchase", href: "/accounts/transactions/purchase" },
];

export const PURCHASE_LIST_PATH = "/accounts/transactions/purchase";

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export type PurchasePaymentStatus = "unpaid" | "partially_paid" | "paid";

export const PURCHASE_PAYMENT_STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
};

export function getPurchasePaymentStatus(amountPaid: number, grandTotal: number): PurchasePaymentStatus {
  if (grandTotal <= 0 || amountPaid <= 0) return "unpaid";
  if (amountPaid >= grandTotal - 0.01) return "paid";
  return "partially_paid";
}
