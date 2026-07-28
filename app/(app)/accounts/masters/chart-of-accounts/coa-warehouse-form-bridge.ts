/** Opens the ERP Warehouse Master form inside Chart of Accounts (keeps sidebar). */

import type { CoaNodeId } from "../../data";

type OpenHandler = ((parentGroupId: CoaNodeId) => void) | null;

let openHandler: OpenHandler = null;

export function registerWarehouseFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestWarehouseForm(parentGroupId: CoaNodeId): boolean {
  if (openHandler) {
    openHandler(parentGroupId);
    return true;
  }
  return false;
}
