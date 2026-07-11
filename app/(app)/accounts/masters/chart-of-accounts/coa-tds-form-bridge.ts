/** Opens the TDS-specific ledger form inside Chart of Accounts (keeps sidebar). */

type OpenHandler = ((parentGroupId: number) => void) | null;

let openHandler: OpenHandler = null;

export function registerTdsLedgerFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestTdsLedgerForm(parentGroupId: number): boolean {
  if (openHandler) {
    openHandler(parentGroupId);
    return true;
  }
  return false;
}
