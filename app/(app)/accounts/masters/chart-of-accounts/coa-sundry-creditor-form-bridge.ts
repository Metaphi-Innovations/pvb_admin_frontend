/** Opens the Vendor form inside Chart of Accounts (keeps Accounts sidebar). */

import type { CoaNodeId } from "../../data";

export type SundryCreditorFormOpenArgs = {
  parentGroupId: CoaNodeId;
  /** Supplier master UUID (API) or legacy numeric id */
  vendorId?: string | number;
};

type OpenHandler = ((args: SundryCreditorFormOpenArgs) => void) | null;

let openHandler: OpenHandler = null;

export function registerSundryCreditorVendorFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestSundryCreditorVendorForm(
  parentGroupId: CoaNodeId,
  vendorId?: string | number,
): boolean {
  if (openHandler) {
    openHandler({ parentGroupId, vendorId });
    return true;
  }
  return false;
}
