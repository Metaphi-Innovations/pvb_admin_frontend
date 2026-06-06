export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const PAYMENTS_LIST_PATH = "/accounts/transactions/payments";

export const PAYMENTS_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Payments", href: PAYMENTS_LIST_PATH },
];
