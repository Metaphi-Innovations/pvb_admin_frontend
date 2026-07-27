/** Opens the Vendor form inside Chart of Accounts (keeps Accounts sidebar). */

export type SundryCreditorFormOpenArgs = {
  parentGroupId: number;
  vendorId?: number;
};

type OpenHandler = ((args: SundryCreditorFormOpenArgs) => void) | null;

let openHandler: OpenHandler = null;

export function registerSundryCreditorVendorFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestSundryCreditorVendorForm(
  parentGroupId: number,
  vendorId?: number,
): boolean {
  if (openHandler) {
    openHandler({ parentGroupId, vendorId });
    return true;
  }
  return false;
}
