/**
 * Helpers for voucher-only UI shells (Payment / Receipt / Contra / Journal /
 * Credit Note / Debit Note). Do not import from other modules.
 */

export type VoucherShellType =
  | "payment"
  | "receipt"
  | "contra"
  | "journal"
  | "credit_note"
  | "debit_note";

const BASE_VISIBILITY = [
  "General Ledger",
  "Day Book",
  "Trial Balance",
  "Audit Trail",
] as const;

export function getVoucherPostingVisibility(opts: {
  type: VoucherShellType;
  includeCashBook?: boolean;
  includeBankBook?: boolean;
  includeGstReports?: boolean;
  includeProfitLoss?: boolean;
  includeBalanceSheet?: boolean;
  includeCashFlow?: boolean;
  includeCustomerLedger?: boolean;
  includeVendorLedger?: boolean;
}): string[] {
  const items: string[] = [];

  if (opts.includeCustomerLedger) items.push("Customer Ledger");
  if (opts.includeVendorLedger) items.push("Vendor Ledger");

  items.push(...BASE_VISIBILITY);

  if (opts.includeCashBook) items.push("Cash Book");
  if (opts.includeBankBook) items.push("Bank Book");
  if (opts.includeCashFlow) items.push("Cash Flow");
  if (opts.includeBalanceSheet) items.push("Balance Sheet");
  if (opts.includeProfitLoss) items.push("Profit & Loss");
  if (opts.includeGstReports) items.push("GST Reports");

  // Stable order for dual cash/bank books after Day Book
  const order = [
    "Customer Ledger",
    "Vendor Ledger",
    "General Ledger",
    "Day Book",
    "Cash Book",
    "Bank Book",
    "Trial Balance",
    "Balance Sheet",
    "Cash Flow",
    "Profit & Loss",
    "GST Reports",
    "Audit Trail",
  ];

  return order.filter((label) => items.includes(label));
}

export function defaultVisibilityForType(
  type: VoucherShellType,
  opts?: { isCash?: boolean; isBank?: boolean; gstApplicable?: boolean },
): string[] {
  switch (type) {
    case "payment":
    case "receipt":
      return getVoucherPostingVisibility({
        type,
        includeCashBook: opts?.isCash ?? false,
        includeBankBook: opts?.isBank ?? false,
        includeBalanceSheet: true,
        includeCashFlow: true,
      });
    case "contra":
      return getVoucherPostingVisibility({
        type,
        includeCashBook: true,
        includeBankBook: true,
        includeBalanceSheet: true,
        includeCashFlow: true,
      });
    case "journal":
      return getVoucherPostingVisibility({
        type,
        includeProfitLoss: true,
        includeBalanceSheet: true,
      });
    case "credit_note":
      return getVoucherPostingVisibility({
        type,
        includeCustomerLedger: true,
        includeGstReports: opts?.gstApplicable ?? false,
        includeProfitLoss: true,
      });
    case "debit_note":
      return getVoucherPostingVisibility({
        type,
        includeVendorLedger: true,
        includeGstReports: opts?.gstApplicable ?? false,
        includeProfitLoss: true,
      });
    default:
      return [...BASE_VISIBILITY];
  }
}

/** Dual-entry group labels for Payment / Receipt / Contra. */
export function getDualEntryGroupLabels(voucherType: string): {
  firstGroup: string;
  secondGroup: string;
  creditFirst: boolean;
} {
  switch (voucherType) {
    case "payment":
      return { firstGroup: "Paid From", secondGroup: "Paid To", creditFirst: true };
    case "receipt":
      return { firstGroup: "Received In", secondGroup: "Received From", creditFirst: false };
    case "contra":
      return { firstGroup: "Transfer From", secondGroup: "Transfer To", creditFirst: true };
    default:
      return { firstGroup: "Debit", secondGroup: "Credit", creditFirst: false };
  }
}
