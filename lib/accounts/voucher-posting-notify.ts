import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  dispatchAccountsDataChanged,
  type AccountsDataScope,
} from "@/lib/accounts/accounts-data-events";

function voucherPostDataScope(voucherType: VoucherTypeCode): AccountsDataScope {
  switch (voucherType) {
    case "receipt":
      return "receipt-vouchers";
    case "payment":
      return "payment-vouchers";
    case "contra":
      return "contra-vouchers";
    case "journal":
      return "journal-vouchers";
    default:
      return "*";
  }
}

/** Notify listings and related views after a voucher is saved or posted. */
export function notifyVoucherListingChanged(
  voucherType: Extract<VoucherTypeCode, "receipt" | "payment" | "contra" | "journal">,
  operation: "create" | "update" | "post" = "update",
): void {
  dispatchAccountsDataChanged(voucherPostDataScope(voucherType), { operation });
}

/** Notify COA, party ledgers, and receivables/payables views after a voucher is posted. */
export function notifyVoucherPosted(voucher: AccountingVoucher): void {
  const scope = voucherPostDataScope(voucher.voucherType);
  const detail = { operation: "post" as const, recordId: voucher.id };
  dispatchAccountsDataChanged(scope, detail);
  dispatchAccountsDataChanged("ledgers", detail);
  if (voucher.voucherType === "receipt") {
    dispatchAccountsDataChanged("receivables", detail);
  }
  if (voucher.voucherType === "payment") {
    dispatchAccountsDataChanged("payables", detail);
  }
}
