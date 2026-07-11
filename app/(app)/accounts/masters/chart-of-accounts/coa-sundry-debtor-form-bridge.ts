/** Opens the Accounts Sundry Debtors customer form inside Chart of Accounts (keeps sidebar). */

type OpenHandler = ((parentGroupId: number) => void) | null;

let openHandler: OpenHandler = null;

export function registerSundryDebtorCustomerFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestSundryDebtorCustomerForm(parentGroupId: number): boolean {
  if (openHandler) {
    openHandler(parentGroupId);
    return true;
  }
  return false;
}
