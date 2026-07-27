/** Opens the Customer form inside Chart of Accounts (keeps Accounts sidebar). */

export type SundryDebtorFormOpenArgs = {
  parentGroupId: number;
  customerId?: number;
};

type OpenHandler = ((args: SundryDebtorFormOpenArgs) => void) | null;

let openHandler: OpenHandler = null;

export function registerSundryDebtorCustomerFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestSundryDebtorCustomerForm(
  parentGroupId: number,
  customerId?: number,
): boolean {
  if (openHandler) {
    openHandler({ parentGroupId, customerId });
    return true;
  }
  return false;
}
