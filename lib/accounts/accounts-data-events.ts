/** Dispatched after accounts transactional data is saved — keeps listings in sync without full reload. */
export const ACCOUNTS_DATA_CHANGED_EVENT = "ds:accounts-data-changed";

export type AccountsDataScope =
  | "coa"
  | "ledgers"
  | "sales-invoices"
  | "purchase-invoices"
  | "credit-notes"
  | "debit-notes"
  | "receipt-vouchers"
  | "payment-vouchers"
  | "contra-vouchers"
  | "journal-vouchers"
  | "receivables"
  | "payables"
  | "bank-reconciliation"
  | "stock-opening"
  | "*";

export type AccountsDataOperation =
  | "create"
  | "update"
  | "post"
  | "cancel"
  | "archive"
  | "delete";

export interface AccountsDataChangedDetail {
  scope: AccountsDataScope;
  /** Optional record identifier for targeted refresh. */
  recordId?: string | number;
  operation?: AccountsDataOperation;
}

export function dispatchAccountsDataChanged(
  scope: AccountsDataScope = "*",
  options?: Pick<AccountsDataChangedDetail, "recordId" | "operation">,
): void {
  if (typeof window === "undefined") return;
  const detail: AccountsDataChangedDetail = { scope, ...options };
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent<AccountsDataChangedDetail>(ACCOUNTS_DATA_CHANGED_EVENT, {
        detail,
      }),
    );
  });
}

export function subscribeAccountsDataChanged(
  handler: (detail: AccountsDataChangedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const custom = event as CustomEvent<AccountsDataChangedDetail>;
    handler(custom.detail ?? { scope: "*" });
  };
  window.addEventListener(ACCOUNTS_DATA_CHANGED_EVENT, listener);
  return () => window.removeEventListener(ACCOUNTS_DATA_CHANGED_EVENT, listener);
}

/** True when a listing should refresh for the given event scope. */
export function accountsDataScopeMatches(
  listenerScope: AccountsDataScope | AccountsDataScope[],
  eventScope: AccountsDataScope,
): boolean {
  if (eventScope === "*") return true;
  const scopes = Array.isArray(listenerScope) ? listenerScope : [listenerScope];
  return scopes.includes("*") || scopes.includes(eventScope);
}
