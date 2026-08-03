/** Lets COA UI open the full-page edit Generic Ledger form via CoaAddLedgerHost. */

import type { CoaNodeId } from "../../data";

type EditLedgerHandler = ((ledgerId: CoaNodeId) => void) | null;

let editLedgerHandler: EditLedgerHandler = null;

export function registerCoaEditLedgerHandler(handler: EditLedgerHandler): void {
  editLedgerHandler = handler;
}

export function requestCoaEditLedger(ledgerId: CoaNodeId): void {
  if (editLedgerHandler) {
    editLedgerHandler(ledgerId);
    return;
  }
  if (typeof window !== "undefined") {
    window.location.assign(
      `/accounts/masters/chart-of-accounts?edit=${encodeURIComponent(String(ledgerId))}`,
    );
  }
}
