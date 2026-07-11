/** Lets COA UI open the edit-ledger drawer owned by CoaAddLedgerHost. */

type EditLedgerHandler = ((ledgerId: number) => void) | null;

let editLedgerHandler: EditLedgerHandler = null;

export function registerCoaEditLedgerHandler(handler: EditLedgerHandler): void {
  editLedgerHandler = handler;
}

export function requestCoaEditLedger(ledgerId: number): void {
  if (editLedgerHandler) {
    editLedgerHandler(ledgerId);
    return;
  }
  if (typeof window !== "undefined") {
    window.location.assign(
      `/accounts/masters/chart-of-accounts?edit=${ledgerId}`,
    );
  }
}
