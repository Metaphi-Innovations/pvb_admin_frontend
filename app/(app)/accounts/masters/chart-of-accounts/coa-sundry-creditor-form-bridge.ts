/** Opens the Accounts Sundry Creditors supplier form inside Chart of Accounts (keeps sidebar). */

type OpenHandler = ((parentGroupId: number) => void) | null;

let openHandler: OpenHandler = null;

export function registerSundryCreditorVendorFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestSundryCreditorVendorForm(parentGroupId: number): boolean {
  if (openHandler) {
    openHandler(parentGroupId);
    return true;
  }
  return false;
}
