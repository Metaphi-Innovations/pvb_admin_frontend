/** Opens the Bank Account form inside Chart of Accounts (keeps Accounts sidebar). */

import type { CoaNodeId } from "../../data";

export type CoaBankFormOpenArgs = {
  parentGroupId: CoaNodeId;
  /** When set, edit the existing Bank Account master (same form / save path). */
  accountId?: number;
};

type OpenHandler = ((args: CoaBankFormOpenArgs) => void) | null;

let openHandler: OpenHandler = null;

export function registerCoaBankFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestCoaBankForm(
  parentGroupId: CoaNodeId,
  accountId?: number,
): boolean {
  if (openHandler) {
    openHandler({ parentGroupId, accountId });
    return true;
  }
  return false;
}
