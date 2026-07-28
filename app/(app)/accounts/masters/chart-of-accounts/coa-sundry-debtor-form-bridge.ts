/** Opens the Customer form inside Chart of Accounts (keeps Accounts sidebar). */

import type { CoaNodeId } from "../../data";

export type SundryDebtorFormOpenArgs = {
  parentGroupId: CoaNodeId;
  /** Customer master UUID (API) or legacy numeric id */
  customerId?: string | number;
};

type OpenHandler = ((args: SundryDebtorFormOpenArgs) => void) | null;

let openHandler: OpenHandler = null;

export function registerSundryDebtorCustomerFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestSundryDebtorCustomerForm(
  parentGroupId: CoaNodeId,
  customerId?: string | number,
): boolean {
  if (openHandler) {
    openHandler({ parentGroupId, customerId });
    return true;
  }
  return false;
}
