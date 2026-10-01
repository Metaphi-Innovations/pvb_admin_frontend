export { formatMoney as formatINR } from "@/lib/accounts/money-format";
export {
	getInvoiceAmountBreakup,
	INVOICE_AMOUNT_LABELS,
} from "./invoices-data";

export const INVOICES_LIST_PATH = "/accounts/transactions/invoices";

export const INVOICES_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Invoices", href: INVOICES_LIST_PATH },
];
