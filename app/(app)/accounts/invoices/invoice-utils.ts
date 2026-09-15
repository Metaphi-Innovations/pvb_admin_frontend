export { formatMoney as formatINR } from "@/lib/accounts/money-format";
export {
	getInvoiceAmountBreakup,
	INVOICE_AMOUNT_LABELS,
} from "./invoices-data";

export const INVOICES_LIST_PATH = "/accounts/transactions/invoices";
export const PENDING_INVOICES_LIST_PATH = "/accounts/sales/pending-tax-invoices";

export const INVOICES_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Invoices", href: INVOICES_LIST_PATH },
];

const SALES_INVOICE_TAB_IDS = [
  "all",
  "sales_order",
  "stock_transfer",
  "sample_order",
  "service",
] as const;

const PENDING_INVOICE_TAB_IDS = ["sales_order", "stock_transfer"] as const;

export type InvoicesListTabId = (typeof SALES_INVOICE_TAB_IDS)[number];
export type PendingInvoicesListTabId = (typeof PENDING_INVOICE_TAB_IDS)[number];

export function parseSalesInvoiceTabParam(
  tab: string | null | undefined,
): InvoicesListTabId | null {
  if (!tab) return null;
  return (SALES_INVOICE_TAB_IDS as readonly string[]).includes(tab)
    ? (tab as InvoicesListTabId)
    : null;
}

export function parsePendingInvoiceTabParam(
  tab: string | null | undefined,
): PendingInvoicesListTabId | null {
  if (!tab) return null;
  return (PENDING_INVOICE_TAB_IDS as readonly string[]).includes(tab)
    ? (tab as PendingInvoicesListTabId)
    : null;
}

/** Sales Invoice register URL, optionally scoped to a tab. */
export function invoicesListHref(tab?: string | null): string {
  const parsed = parseSalesInvoiceTabParam(tab);
  if (!parsed || parsed === "all") return INVOICES_LIST_PATH;
  return `${INVOICES_LIST_PATH}?tab=${encodeURIComponent(parsed)}`;
}

/** Pending Invoices register URL, optionally scoped to a tab. */
export function pendingInvoicesListHref(tab?: string | null): string {
  const parsed = parsePendingInvoiceTabParam(tab);
  if (!parsed) return PENDING_INVOICES_LIST_PATH;
  return `${PENDING_INVOICES_LIST_PATH}?tab=${encodeURIComponent(parsed)}`;
}

/** Prefer the matching Sales Invoice tab when returning from a typed invoice. */
export function invoicesListHrefForSourceType(
  sourceType?: string | null,
): string {
  if (sourceType === "stock_transfer") return invoicesListHref("stock_transfer");
  if (sourceType === "sales_order") return invoicesListHref("sales_order");
  if (sourceType === "sample_order") return invoicesListHref("sample_order");
  if (sourceType === "service") return invoicesListHref("all");
  return INVOICES_LIST_PATH;
}

/**
 * Only allow same-app relative paths so returnTo cannot open an external URL.
 */
export function safeInternalReturnPath(
  returnTo: string | null | undefined,
  fallback: string,
): string {
  if (!returnTo) return fallback;
  const trimmed = returnTo.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("://")
  ) {
    return fallback;
  }
  return trimmed;
}

/** Append or replace `returnTo` on an internal href. */
export function withReturnTo(href: string, returnTo: string): string {
  const url = new URL(href, "http://local.invalid");
  url.searchParams.set("returnTo", returnTo);
  return `${url.pathname}${url.search}`;
}
