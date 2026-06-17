export const RECONCILIATION_LIST_PATH = "/accounts/banking/reconciliation";

export const RECONCILIATION_BREADCRUMB = [
  { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
  { label: "Banking" },
  { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
];

export { formatMoney as formatINR } from "@/lib/accounts/money-format";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthYearLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}
