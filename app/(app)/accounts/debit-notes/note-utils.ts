import {
  safeInternalReturnPath,
  withReturnTo,
} from "../invoices/invoice-utils";

export { formatINR } from "../invoices/invoice-utils";

export const DEBIT_NOTES_LIST_PATH = "/accounts/transactions/debit-notes";

export const DEBIT_NOTES_BREADCRUMB = [
  { label: "Accounts", href: "/accounts" },
  { label: "Debit Notes", href: DEBIT_NOTES_LIST_PATH },
];

export type DebitNotesModuleTabId = "pending" | "records";
export type DebitNotesStatusTabId =
  | "all"
  | "draft"
  | "posted"
  | "cancelled"
  | "reversed";

const MODULE_TABS = ["pending", "records"] as const;
const STATUS_TABS = ["all", "draft", "posted", "cancelled", "reversed"] as const;

export function parseDebitNotesModuleTab(
  tab: string | null | undefined,
): DebitNotesModuleTabId | null {
  if (!tab) return null;
  return (MODULE_TABS as readonly string[]).includes(tab)
    ? (tab as DebitNotesModuleTabId)
    : null;
}

export function parseDebitNotesStatusTab(
  status: string | null | undefined,
): DebitNotesStatusTabId | null {
  if (!status) return null;
  return (STATUS_TABS as readonly string[]).includes(status)
    ? (status as DebitNotesStatusTabId)
    : null;
}

/** Debit Notes register URL, scoped to module tab (and status when on records). */
export function debitNotesListHref(
  tab?: string | null,
  status?: string | null,
): string {
  const moduleTab = parseDebitNotesModuleTab(tab) ?? "pending";
  const params = new URLSearchParams();
  if (moduleTab !== "pending") params.set("tab", moduleTab);
  if (moduleTab === "records") {
    const statusTab = parseDebitNotesStatusTab(status);
    if (statusTab && statusTab !== "all") params.set("status", statusTab);
  }
  const qs = params.toString();
  return qs ? `${DEBIT_NOTES_LIST_PATH}?${qs}` : DEBIT_NOTES_LIST_PATH;
}

export function debitNoteReturnPath(
  returnTo: string | null | undefined,
  fallbackTab?: string | null,
  fallbackStatus?: string | null,
): string {
  const fallback = debitNotesListHref(fallbackTab, fallbackStatus);
  const safe = safeInternalReturnPath(returnTo, "");
  if (!safe) return fallback;

  try {
    const url = new URL(safe, "http://local.invalid");
    const listPath = DEBIT_NOTES_LIST_PATH.replace(/\/$/, "");
    const pathname = url.pathname.replace(/\/$/, "");
    if (pathname === listPath) {
      // Prefer tab/status on returnTo; if `?` was stripped from returnTo
      // (All tab = `?tab=records`), recover from leftover document query params.
      const tab = url.searchParams.get("tab") || fallbackTab;
      const status = url.searchParams.get("status") || fallbackStatus;
      return debitNotesListHref(tab, status);
    }
  } catch {
    return fallback;
  }

  return safe;
}

export { withReturnTo, safeInternalReturnPath };
