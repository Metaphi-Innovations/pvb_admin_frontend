/** Opens the Bank Account form inside Chart of Accounts (keeps Accounts sidebar). */

import type { CoaNodeId } from "../../data";

export type CoaBankFormOpenArgs = {
  parentGroupId: CoaNodeId;
  /**
   * Ledger UUID (`apiNodeId`) for edit / complete.
   * Create mode when omitted.
   */
  ledgerId?: string;
};

type OpenHandler = ((args: CoaBankFormOpenArgs) => void) | null;

let openHandler: OpenHandler = null;

export function registerCoaBankFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestCoaBankForm(
  parentGroupId: CoaNodeId,
  ledgerId?: string,
): boolean {
  if (openHandler) {
    openHandler({ parentGroupId, ledgerId });
    return true;
  }
  return false;
}
