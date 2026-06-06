export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export const EXPENSE_LIST_PATH = "/accounts/transactions/expenses";

export const EXPENSE_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Expenses", href: EXPENSE_LIST_PATH },
];
