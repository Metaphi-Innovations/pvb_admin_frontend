/** Lets the COA sidebar tree open the add-ledger drawer owned by ChartOfAccountsPageClient. */

let addLedgerHandler: ((parentGroupId: number) => void) | null = null;

export function registerCoaAddLedgerHandler(
  handler: ((parentGroupId: number) => void) | null,
): void {
  addLedgerHandler = handler;
}

export function requestCoaAddLedger(parentGroupId: number): void {
  addLedgerHandler?.(parentGroupId);
}
