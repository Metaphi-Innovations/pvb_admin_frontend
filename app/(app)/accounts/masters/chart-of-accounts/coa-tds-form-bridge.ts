/** Opens the TDS-specific ledger form inside Chart of Accounts (keeps sidebar). */

import type { CoaNodeId } from "../../data";

type OpenHandler = ((parentGroupId: CoaNodeId) => void) | null;

let openHandler: OpenHandler = null;

export function registerTdsLedgerFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestTdsLedgerForm(parentGroupId: CoaNodeId): boolean {
  if (openHandler) {
    openHandler(parentGroupId);
    return true;
  }
  return false;
}
