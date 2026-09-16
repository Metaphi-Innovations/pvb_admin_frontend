import {
  safeInternalReturnPath,
  withReturnTo,
} from "@/app/(app)/accounts/invoices/invoice-utils";

export const PURCHASE_INVOICES_LIST_PATH = "/accounts/purchase-invoices";

export type PurchaseInvoiceListTabId = "invoices" | "grn_pending";

const PURCHASE_INVOICE_TAB_IDS = ["invoices", "grn_pending"] as const;

export function parsePurchaseInvoiceTabParam(
  tab: string | null | undefined,
): PurchaseInvoiceListTabId | null {
  if (!tab) return null;
  return (PURCHASE_INVOICE_TAB_IDS as readonly string[]).includes(tab)
    ? (tab as PurchaseInvoiceListTabId)
    : null;
}

/** Purchase Invoice register URL, optionally scoped to a tab. */
export function purchaseInvoicesListHref(tab?: string | null): string {
  const parsed = parsePurchaseInvoiceTabParam(tab);
  if (!parsed || parsed === "invoices") return PURCHASE_INVOICES_LIST_PATH;
  return `${PURCHASE_INVOICES_LIST_PATH}?tab=${encodeURIComponent(parsed)}`;
}

export function purchaseInvoiceReturnPath(
  returnTo: string | null | undefined,
  fallbackTab?: string | null,
): string {
  return safeInternalReturnPath(returnTo, purchaseInvoicesListHref(fallbackTab));
}

export { withReturnTo, safeInternalReturnPath };
