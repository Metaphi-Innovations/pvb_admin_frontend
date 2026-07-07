/** Lets the COA sidebar tree open the add-ledger drawer owned by CoaAddLedgerHost. */

const CHART_OF_ACCOUNTS_PATH = "/accounts/masters/chart-of-accounts";

type CoaAddLedgerHandlers = {
  addUnderParent: ((parentGroupId: number) => void) | null;
  openGlobal: ((preferredParentId?: number | null) => void) | null;
};

let handlers: CoaAddLedgerHandlers = {
  addUnderParent: null,
  openGlobal: null,
};

export function registerCoaAddLedgerHandlers(next: CoaAddLedgerHandlers): void {
  handlers = next;
}

/** @deprecated Use registerCoaAddLedgerHandlers */
export function registerCoaAddLedgerHandler(
  handler: ((parentGroupId: number) => void) | null,
): void {
  handlers = { ...handlers, addUnderParent: handler };
}

function navigateToCoaAddLedger(parentId: number | "global"): void {
  if (typeof window === "undefined") return;
  const url =
    parentId === "global"
      ? `${CHART_OF_ACCOUNTS_PATH}?addLedger=global`
      : `${CHART_OF_ACCOUNTS_PATH}?addLedger=${parentId}`;
  window.location.assign(url);
}

export function requestCoaAddLedger(parentGroupId: number): void {
  if (handlers.addUnderParent) {
    handlers.addUnderParent(parentGroupId);
    return;
  }
  navigateToCoaAddLedger(parentGroupId);
}

export function requestCoaGlobalAddLedger(preferredParentId?: number | null): void {
  if (handlers.openGlobal) {
    handlers.openGlobal(preferredParentId);
    return;
  }
  if (preferredParentId != null) {
    navigateToCoaAddLedger(preferredParentId);
  } else {
    navigateToCoaAddLedger("global");
  }
}
