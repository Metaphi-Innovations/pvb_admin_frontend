/**
 * Reference type options for voucher entry lines — shared across all voucher types.
 */

import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { VoucherEntryType } from "@/lib/accounts/voucher-form-model";
import {
  isCustomerPartyLedger,
  isVendorPartyLedger,
} from "@/lib/accounts/voucher-ledger-groups";
import {
  ledgerMatchesReceiptDebitScope,
} from "@/lib/accounts/voucher-quick-add-ledger";

export type VoucherReferenceType =
  | "new_reference"
  | "against_invoice"
  | "advance"
  | "on_account"
  | "against_credit_note"
  | "against_debit_note"
  | "against_opening_balance"
  | "transfer"
  | "other";

export const VOUCHER_REFERENCE_TYPE_LABELS: Record<VoucherReferenceType, string> = {
  new_reference: "New Reference",
  against_invoice: "Against Reference",
  advance: "Advance",
  on_account: "On Account",
  against_credit_note: "Against Credit Note",
  against_debit_note: "Against Debit Note",
  against_opening_balance: "Against Opening Balance",
  transfer: "Transfer",
  other: "Other",
};

const BANK_SIDE_TYPES: VoucherReferenceType[] = ["on_account", "transfer", "other"];
const CONTRA_TYPES: VoucherReferenceType[] = ["on_account", "transfer", "other"];
const PARTY_TYPES: VoucherReferenceType[] = [
  "new_reference",
  "against_invoice",
  "advance",
  "on_account",
  "against_credit_note",
  "against_debit_note",
  "against_opening_balance",
  "other",
];
const GENERIC_BILL_WISE_TYPES: VoucherReferenceType[] = [
  "new_reference",
  "against_invoice",
  "advance",
  "on_account",
];

/** True when ledger has bill-wise accounting enabled (party defaults or generic toggle). */
export function isBillWiseEnabledLedger(ledger: ChartOfAccount | null | undefined): boolean {
  if (!ledger) return false;
  return ledger.billWiseAccounting === true;
}

export function defaultEntryReferenceType(
  voucherType: VoucherTypeCode,
  entryType: VoucherEntryType,
): VoucherReferenceType {
  if (voucherType === "contra") return "transfer";
  if (voucherType === "receipt" && entryType === "DEBIT") return "on_account";
  if (voucherType === "payment" && entryType === "CREDIT") return "on_account";
  return "on_account";
}

export function supportsInvoiceAllocation(
  voucherType: VoucherTypeCode,
  ledger: ChartOfAccount | null,
  coaRecords: ChartOfAccount[],
): boolean {
  if (!ledger) return false;
  if (voucherType !== "receipt" && voucherType !== "payment" && voucherType !== "journal") {
    return false;
  }
  if (isCustomerPartyLedger(ledger, coaRecords) || isVendorPartyLedger(ledger, coaRecords)) {
    return true;
  }
  return isBillWiseEnabledLedger(ledger);
}

export function isBankCashEntry(
  ledger: ChartOfAccount | null,
  coaRecords: ChartOfAccount[],
): boolean {
  if (!ledger) return false;
  return ledgerMatchesReceiptDebitScope(ledger, coaRecords);
}

export function getAvailableReferenceTypes(
  voucherType: VoucherTypeCode,
  entryType: VoucherEntryType,
  ledger: ChartOfAccount | null,
  coaRecords: ChartOfAccount[],
): VoucherReferenceType[] {
  if (voucherType === "contra") return CONTRA_TYPES;

  const bankSide =
    (voucherType === "receipt" && entryType === "DEBIT") ||
    (voucherType === "payment" && entryType === "CREDIT");

  if (bankSide || isBankCashEntry(ledger, coaRecords)) {
    return BANK_SIDE_TYPES;
  }

  if (supportsInvoiceAllocation(voucherType, ledger, coaRecords)) {
    if (
      ledger &&
      !isCustomerPartyLedger(ledger, coaRecords) &&
      !isVendorPartyLedger(ledger, coaRecords) &&
      isBillWiseEnabledLedger(ledger)
    ) {
      return GENERIC_BILL_WISE_TYPES;
    }
    return PARTY_TYPES;
  }

  // Non-bill-wise generic ledgers: no reference selection beyond on-account/other
  if (ledger && !isBillWiseEnabledLedger(ledger)) {
    return ["on_account", "other"];
  }

  return ["on_account", "advance", "other"];
}

export function referenceTypeRequiresDocument(refType: VoucherReferenceType): boolean {
  return (
    refType === "against_invoice" ||
    refType === "against_credit_note" ||
    refType === "against_debit_note" ||
    refType === "against_opening_balance"
  );
}

export function referenceTypeAllowsTextReference(refType: VoucherReferenceType): boolean {
  return refType === "transfer" || refType === "other" || refType === "new_reference";
}

export function referenceTypeShowsAllocationPicker(refType: VoucherReferenceType): boolean {
  return refType === "against_invoice";
}
