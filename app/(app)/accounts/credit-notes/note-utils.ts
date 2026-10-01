export { formatINR } from "../invoices/invoice-utils";

export const CREDIT_NOTES_LIST_PATH = "/accounts/transactions/credit-notes";

export const CREDIT_NOTES_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Credit Notes", href: CREDIT_NOTES_LIST_PATH },
];
