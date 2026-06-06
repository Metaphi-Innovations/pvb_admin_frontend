export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const INVOICES_LIST_PATH = "/accounts/transactions/invoices";

export const INVOICES_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Invoices", href: INVOICES_LIST_PATH },
];
