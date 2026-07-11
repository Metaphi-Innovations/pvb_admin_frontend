/** Opens the ERP Warehouse Master form inside Chart of Accounts (keeps sidebar). */

type OpenHandler = ((parentGroupId: number) => void) | null;

let openHandler: OpenHandler = null;

export function registerWarehouseFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestWarehouseForm(parentGroupId: number): boolean {
  if (openHandler) {
    openHandler(parentGroupId);
    return true;
  }
  return false;
}
