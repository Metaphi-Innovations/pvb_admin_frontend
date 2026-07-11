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
  | "against_invoice"
  | "advance"
  | "on_account"
  | "against_credit_note"
  | "against_debit_note"
  | "against_opening_balance"
  | "transfer"
  | "other";

export const VOUCHER_REFERENCE_TYPE_LABELS: Record<VoucherReferenceType, string> = {
  against_invoice: "Against Invoice",
  advance: "Advance",
  on_account: "On Account",
  against_credit_note: "Against Credit Note",
  against_debit_note: "Against Debit Note",
  against_opening_balance: "Against Opening Balance",
  transfer: "Transfer",
  other: "Other",
};

const ALL_REFERENCE_TYPES: VoucherReferenceType[] = [
  "against_invoice",
  "advance",
  "on_account",
  "against_credit_note",
  "against_debit_note",
  "against_opening_balance",
  "other",
];

const BANK_SIDE_TYPES: VoucherReferenceType[] = ["on_account", "transfer", "other"];
const CONTRA_TYPES: VoucherReferenceType[] = ["on_account", "transfer", "other"];
const PARTY_TYPES: VoucherReferenceType[] = [
  "against_invoice",
  "advance",
  "on_account",
  "against_credit_note",
  "against_debit_note",
  "against_opening_balance",
  "other",
];

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
  if (voucherType === "receipt" || voucherType === "payment" || voucherType === "journal") {
    return (
      isCustomerPartyLedger(ledger, coaRecords) || isVendorPartyLedger(ledger, coaRecords)
    );
  }
  return false;
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
    return PARTY_TYPES;
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
  return refType === "transfer" || refType === "other";
}

export function referenceTypeShowsAllocationPicker(refType: VoucherReferenceType): boolean {
  return refType === "against_invoice";
}
