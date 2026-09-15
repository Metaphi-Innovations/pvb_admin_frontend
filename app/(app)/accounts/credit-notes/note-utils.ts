import {
  safeInternalReturnPath,
  withReturnTo,
} from "../invoices/invoice-utils";

export { formatINR } from "../invoices/invoice-utils";

export const CREDIT_NOTES_LIST_PATH = "/accounts/transactions/credit-notes";

export const CREDIT_NOTES_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Credit Notes", href: CREDIT_NOTES_LIST_PATH },
];

export type CreditNotesModuleTabId = "pending" | "records";
export type CreditNotesStatusTabId =
  | "all"
  | "draft"
  | "posted"
  | "cancelled"
  | "reversed";

const MODULE_TABS = ["pending", "records"] as const;
const STATUS_TABS = ["all", "draft", "posted", "cancelled", "reversed"] as const;

export function parseCreditNotesModuleTab(
  tab: string | null | undefined,
): CreditNotesModuleTabId | null {
  if (!tab) return null;
  return (MODULE_TABS as readonly string[]).includes(tab)
    ? (tab as CreditNotesModuleTabId)
    : null;
}

export function parseCreditNotesStatusTab(
  status: string | null | undefined,
): CreditNotesStatusTabId | null {
  if (!status) return null;
  return (STATUS_TABS as readonly string[]).includes(status)
    ? (status as CreditNotesStatusTabId)
    : null;
}

/** Credit Notes register URL, scoped to module tab (and status when on records). */
export function creditNotesListHref(
  tab?: string | null,
  status?: string | null,
): string {
  const moduleTab = parseCreditNotesModuleTab(tab) ?? "pending";
  const params = new URLSearchParams();
  if (moduleTab !== "pending") params.set("tab", moduleTab);
  if (moduleTab === "records") {
    const statusTab = parseCreditNotesStatusTab(status);
    if (statusTab && statusTab !== "all") params.set("status", statusTab);
  }
  const qs = params.toString();
  return qs ? `${CREDIT_NOTES_LIST_PATH}?${qs}` : CREDIT_NOTES_LIST_PATH;
}

export function creditNoteReturnPath(
  returnTo: string | null | undefined,
  fallbackTab?: string | null,
  fallbackStatus?: string | null,
): string {
  return safeInternalReturnPath(
    returnTo,
    creditNotesListHref(fallbackTab, fallbackStatus),
  );
}

export { withReturnTo, safeInternalReturnPath };
