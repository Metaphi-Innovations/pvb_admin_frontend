export { formatINR } from "../invoices/invoice-utils";

export const DEBIT_NOTES_LIST_PATH = "/accounts/transactions/debit-notes";

export const DEBIT_NOTES_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Debit Notes", href: DEBIT_NOTES_LIST_PATH },
];
