/**
 * Per-voucher-type UI configuration for the shared voucher form model.
 * Accounting behaviour differs; field names and structure stay common.
 */

import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  ledgerMatchesContraScope,
  ledgerMatchesPaymentCreditScope,
  ledgerMatchesPaymentDebitScope,
  ledgerMatchesReceiptCreditScope,
  ledgerMatchesReceiptDebitScope,
  type VoucherLedgerScope,
} from "@/lib/accounts/voucher-quick-add-ledger";

export type VoucherFormLayout = "dual-simple" | "journal-grid";

const RECEIPT_PAYMENT_MODES = ["Cash", "Cheque", "NEFT/RTGS", "UPI", "IMPS", "Other"] as const;
const CONTRA_TRANSFER_MODES = ["Bank Transfer", "Cash Deposit", "Cash Withdrawal", "Cheque", "Other"] as const;

export interface VoucherFormTypeConfig {
  voucherType: VoucherTypeCode;
  layout: VoucherFormLayout;
  pageSubtitle: string;
  detailsSectionTitle: string;
  voucherNumberLabel: string;
  transactionModeLabel: string;
  transactionModeOptions: readonly string[];
  defaultTransactionMode: string;
  /** When false, Mode of Payment/Receipt/Transfer is hidden (journal). Default true. */
  showTransactionMode?: boolean;
  debitAccountLabel: string;
  creditAccountLabel: string;
  debitAccountPlaceholder: string;
  creditAccountPlaceholder: string;
  debitQuickAddScope?: VoucherLedgerScope;
  creditQuickAddScope?: VoucherLedgerScope;
  debitAccountFilter: (
    ledger: ChartOfAccount,
    records: ChartOfAccount[],
    otherAccountId?: number | null,
  ) => boolean;
  creditAccountFilter: (
    ledger: ChartOfAccount,
    records: ChartOfAccount[],
    otherAccountId?: number | null,
  ) => boolean;
  remarkOnCreditEntry: boolean;
  showBankRemark: boolean;
  showInvoiceAllocation: boolean;
  showTds: boolean;
  /** When true, credit account section renders above debit (payment voucher). */
  creditAccountFirst?: boolean;
  /** Dual-entry vouchers: whether Amount is editable on the debit row (default true). */
  amountEditableOnDebit?: boolean;
  /** Dual-entry vouchers: whether Amount is editable on the credit row (default true). */
  amountEditableOnCredit?: boolean;
}

function bankCashFilter(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
  otherAccountId?: number | null,
): boolean {
  if (!ledgerMatchesReceiptDebitScope(ledger, records)) return false;
  if (otherAccountId != null && ledger.id === otherAccountId) return false;
  return true;
}

function contraAccountFilter(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
  otherAccountId?: number | null,
): boolean {
  if (!ledgerMatchesContraScope(ledger, records)) return false;
  if (otherAccountId != null && ledger.id === otherAccountId) return false;
  return true;
}

export function getVoucherFormConfig(voucherType: VoucherTypeCode): VoucherFormTypeConfig {
  switch (voucherType) {
    case "receipt":
      return {
        voucherType: "receipt",
        layout: "dual-simple",
        pageSubtitle: "Record money received from a customer, vendor refund, or income account.",
        detailsSectionTitle: "Receipt Details",
        voucherNumberLabel: "Receipt No.",
        transactionModeLabel: "Mode of Receipt",
        transactionModeOptions: RECEIPT_PAYMENT_MODES,
        defaultTransactionMode: "NEFT/RTGS",
        debitAccountLabel: "Account (Dr)",
        creditAccountLabel: "Account (Cr)",
        debitAccountPlaceholder: "Select cash or bank ledger…",
        creditAccountPlaceholder: "Select customer, income, capital, loan or liability…",
        debitQuickAddScope: undefined,
        creditQuickAddScope: undefined,
        debitAccountFilter: (ledger, records, other) => bankCashFilter(ledger, records, other),
        creditAccountFilter: (ledger, records, other) => {
          if (!ledgerMatchesReceiptCreditScope(ledger, records)) return false;
          if (other != null && ledger.id === other) return false;
          return true;
        },
        remarkOnCreditEntry: true,
        showBankRemark: false,
        showInvoiceAllocation: true,
        showTds: false,
        amountEditableOnDebit: false,
        amountEditableOnCredit: true,
      };

    case "payment":
      return {
        voucherType: "payment",
        layout: "dual-simple",
        pageSubtitle: "Record payment to a vendor or expense account.",
        detailsSectionTitle: "Payment Details",
        voucherNumberLabel: "Payment No.",
        transactionModeLabel: "Mode of Payment",
        transactionModeOptions: RECEIPT_PAYMENT_MODES,
        defaultTransactionMode: "NEFT/RTGS",
        debitAccountLabel: "Account (Dr)",
        creditAccountLabel: "Account (Cr)",
        debitAccountPlaceholder: "Select vendor, expense, payable…",
        creditAccountPlaceholder: "Select bank, cash, OD or CC account…",
        debitQuickAddScope: "payment_debit",
        creditQuickAddScope: "payment_credit",
        debitAccountFilter: (ledger, records, other) => {
          if (!ledgerMatchesPaymentDebitScope(ledger, records)) return false;
          if (other != null && ledger.id === other) return false;
          return true;
        },
        creditAccountFilter: (ledger, records, other) => {
          if (!ledgerMatchesPaymentCreditScope(ledger, records)) return false;
          if (other != null && ledger.id === other) return false;
          return true;
        },
        remarkOnCreditEntry: false,
        showBankRemark: true,
        showInvoiceAllocation: true,
        showTds: true,
        creditAccountFirst: true,
        amountEditableOnDebit: true,
        amountEditableOnCredit: false,
      };

    case "contra":
      return {
        voucherType: "contra",
        layout: "dual-simple",
        pageSubtitle:
          "Transfer funds between Bank, Cash-in-Hand, OD and CC accounts — debit one account and credit another for the same amount.",
        detailsSectionTitle: "Contra Entry",
        voucherNumberLabel: "Contra No.",
        transactionModeLabel: "Mode of Transfer",
        transactionModeOptions: CONTRA_TRANSFER_MODES,
        defaultTransactionMode: "Bank Transfer",
        debitAccountLabel: "Account (Dr)",
        creditAccountLabel: "Account (Cr)",
        debitAccountPlaceholder: "Select bank, cash, OD or CC account…",
        creditAccountPlaceholder: "Select bank, cash, OD or CC account…",
        debitQuickAddScope: undefined,
        creditQuickAddScope: undefined,
        debitAccountFilter: contraAccountFilter,
        creditAccountFilter: contraAccountFilter,
        remarkOnCreditEntry: false,
        showBankRemark: false,
        showInvoiceAllocation: false,
        showTds: false,
        amountEditableOnDebit: true,
        amountEditableOnCredit: false,
      };

    case "journal":
    default:
      return {
        voucherType: "journal",
        layout: "journal-grid",
        pageSubtitle: "Record multiple debit and credit lines. Total debit must equal total credit.",
        detailsSectionTitle: "Journal Entries",
        voucherNumberLabel: "Journal No.",
        transactionModeLabel: "Mode of Payment",
        transactionModeOptions: [],
        defaultTransactionMode: "",
        showTransactionMode: false,
        debitAccountLabel: "Account",
        creditAccountLabel: "Account",
        debitAccountPlaceholder: "Select an account…",
        creditAccountPlaceholder: "Select an account…",
        debitAccountFilter: () => true,
        creditAccountFilter: () => true,
        remarkOnCreditEntry: false,
        showBankRemark: false,
        showInvoiceAllocation: false,
        showTds: false,
      };
  }
}
