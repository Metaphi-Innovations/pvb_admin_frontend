export { formatMoney as formatINR } from "@/lib/accounts/money-format";

export const PAYMENTS_LIST_PATH = "/accounts/transactions/payments";

export const PAYMENTS_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Payments", href: PAYMENTS_LIST_PATH },
];
