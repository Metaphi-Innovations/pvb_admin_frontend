export { formatMoney as formatINR } from "@/lib/accounts/money-format";

export const EXPENSE_LIST_PATH = "/accounts/transactions/journal";

export const EXPENSE_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Journal", href: EXPENSE_LIST_PATH },
];
