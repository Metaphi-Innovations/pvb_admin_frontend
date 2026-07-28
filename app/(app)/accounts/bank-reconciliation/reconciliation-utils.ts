export const RECONCILIATION_LIST_PATH = "/accounts/banking/reconciliation";

/** Full-page reconciliation workspace for a bank account */
export function bankReconWorkspacePath(accountId: string): string {
  return `${RECONCILIATION_LIST_PATH}/${accountId}`;
}

export interface BankReconCompletePathOptions {
  sessionId?: string;
  periodFrom?: string;
  periodTo?: string;
}

/** Complete reconciliation review screen */
export function bankReconCompletePath(
  accountId: string,
  sessionIdOrOptions?: string | BankReconCompletePathOptions,
): string {
  const base = `${RECONCILIATION_LIST_PATH}/${accountId}/complete`;
  let sessionId: string | undefined;
  let periodFrom: string | undefined;
  let periodTo: string | undefined;

  if (typeof sessionIdOrOptions === "string") {
    sessionId = sessionIdOrOptions;
  } else if (sessionIdOrOptions) {
    sessionId = sessionIdOrOptions.sessionId;
    periodFrom = sessionIdOrOptions.periodFrom;
    periodTo = sessionIdOrOptions.periodTo;
  }

  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (periodFrom) params.set("periodFrom", periodFrom);
  if (periodTo) params.set("periodTo", periodTo);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Full-page statement upload wizard (Tally-style import flow) */
export function bankReconUploadPath(accountId?: string): string {
  if (accountId) {
    return `${RECONCILIATION_LIST_PATH}/upload?accountId=${encodeURIComponent(accountId)}`;
  }
  return `${RECONCILIATION_LIST_PATH}/upload`;
}

export const BANK_RECON_IMPORT_HISTORY_PATH = `${RECONCILIATION_LIST_PATH}/import-history`;

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
