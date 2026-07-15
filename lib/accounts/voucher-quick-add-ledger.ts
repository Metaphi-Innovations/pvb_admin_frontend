import {
  getCoaLedgers,
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import {
  canAddLedgerUnder,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  getAncestorPath,
  type LedgerFormValues,
  type LedgerParentOption,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import {
  isPostableNode,
  ledgerHasAncestorNamed,
  resolveHierarchyPath,
} from "@/lib/accounts/coa-hierarchy";
import { resolveSpecializedGroupType } from "@/lib/accounts/coa-specialized-groups";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";
import { isBankAccountMappedToWarehouse, resolveWarehouseId } from "@/lib/accounts/bank-warehouse-mapping";
import type { VoucherLine, VoucherTypeCode } from "@/app/(app)/accounts/vouchers/voucher-data";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";

/** Ledger picker / quick-add context for Receipt & Payment vouchers only */
export type VoucherLedgerScope =
  | "bank_cash"
  | "receipt_debit"
  | "payment_credit"
  | "party_receivable"
  | "party_payable"
  | "expense"
  | "income"
  | "tax"
  | "loan_advance"
  | "receipt_credit"
  | "payment_debit";

const VOUCHER_QUICK_ADD_OVERRIDE_BLOCKED = new Set([
  "Trade Receivables / Sundry Debtors",
  "Trade Payables / Sundry Creditors",
  "Bank Accounts",
  "Cash-in-Hand",
]);

function pathNameSet(records: ChartOfAccount[], nodeId: number): Set<string> {
  const names = getAncestorPath(records, nodeId).map((n) => n.accountName);
  return new Set(names);
}

/** Parent nodes where voucher quick-add may create ledgers (overrides master-owned COA blocks). */
export function canVoucherQuickAddLedgerUnder(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  const names = [...pathNameSet(records, node.id), node.accountName];
  if (isAddLedgerBlocked(node, records)) {
    const allowed = names.some((n) => VOUCHER_QUICK_ADD_OVERRIDE_BLOCKED.has(n));
    if (!allowed) return false;
    return canAddLedgerUnder(node, records);
  }
  return canAddLedgerUnder(node, records);
}

/** Parent options for voucher quick-add (includes bank, receivable, payable groups). */
export function buildVoucherLedgerParentOptions(records: ChartOfAccount[]): LedgerParentOption[] {
  return records
    .filter((r) => canVoucherQuickAddLedgerUnder(r, records))
    .sort((a, b) => {
      const pathA = getAncestorPath(records, a.id).map((n) => n.accountCode).join("/");
      const pathB = getAncestorPath(records, b.id).map((n) => n.accountCode).join("/");
      return pathA.localeCompare(pathB);
    })
    .map((node) => {
      const path = getAncestorPath(records, node.id);
      const names = path.map((n) => n.accountName);
      const codes = path.map((n) => n.accountCode);
      return {
        id: node.id,
        node,
        path,
        breadcrumb: names.join(" › "),
        searchText: [...names, ...codes].join(" ").toLowerCase(),
      };
    });
}

function matchesBankCashParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = [...pathNameSet(records, node.id), node.accountName];
  return names.some(
    (n) => n === "Bank Accounts" || n === "Cash-in-Hand",
  );
}

function matchesReceivableParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const lower = [...pathNameSet(records, node.id), node.accountName].map((n) =>
    n.toLowerCase(),
  );
  return lower.some((n) => n.includes("receivable") || n.includes("sundry debtor"));
}

function matchesPayableParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const lower = [...pathNameSet(records, node.id), node.accountName].map((n) =>
    n.toLowerCase(),
  );
  return lower.some((n) => n.includes("trade payable") || n.includes("sundry creditor"));
}

function matchesExpenseParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const path = getAncestorPath(records, node.id);
  return path.some((p) => p.accountType === "Expense") || node.accountType === "Expense";
}

function matchesIncomeParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const path = getAncestorPath(records, node.id);
  return path.some((p) => p.accountType === "Income") || node.accountType === "Income";
}

function matchesTaxParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const lower = [...pathNameSet(records, node.id), node.accountName].map((n) =>
    n.toLowerCase(),
  );
  return lower.some((n) => n.includes("duties") && n.includes("tax"));
}

function matchesLoanAdvanceParent(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const lower = [...pathNameSet(records, node.id), node.accountName].map((n) =>
    n.toLowerCase(),
  );
  return lower.some((n) => n.includes("loan") || n.includes("advance"));
}

/** Filter valid parent groups shown in voucher quick-add modal */
export function parentMatchesVoucherQuickAddScope(
  node: ChartOfAccount,
  scope: VoucherLedgerScope | undefined,
  records: ChartOfAccount[],
): boolean {
  if (!canVoucherQuickAddLedgerUnder(node, records)) return false;
  if (!scope) return true;

  switch (scope) {
    case "bank_cash":
    case "receipt_debit":
    case "payment_credit":
      return matchesBankCashParent(node, records);
    case "party_receivable":
      return matchesReceivableParent(node, records);
    case "party_payable":
      return matchesPayableParent(node, records);
    case "expense":
      return matchesExpenseParent(node, records);
    case "income":
      return matchesIncomeParent(node, records);
    case "tax":
      return matchesTaxParent(node, records);
    case "loan_advance":
      return matchesLoanAdvanceParent(node, records);
    case "receipt_credit":
      return (
        matchesReceivableParent(node, records) ||
        matchesPayableParent(node, records) ||
        matchesIncomeParent(node, records) ||
        matchesLoanAdvanceParent(node, records) ||
        ledgerHasAncestorNamed(node, "Capital Account", records) ||
        node.accountName.toLowerCase().includes("deposit") ||
        ledgerHasAncestorNamed(node, "Loans / Borrowings", records)
      );
    case "payment_debit":
      return (
        matchesPayableParent(node, records) ||
        matchesExpenseParent(node, records) ||
        matchesTaxParent(node, records) ||
        matchesLoanAdvanceParent(node, records) ||
        node.accountType === "Asset" ||
        ledgerHasAncestorNamed(node, "Fixed Assets", records) ||
        ledgerHasAncestorNamed(node, "GST Payable", records) ||
        ledgerHasAncestorNamed(node, "TDS Payable", records)
      );
    default:
      return true;
  }
}

function ledgerUnderExpense(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveHierarchyPath(records, ledger.id).path.some((p) => p.accountType === "Expense");
}

function ledgerUnderIncome(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return resolveHierarchyPath(records, ledger.id).path.some((p) => p.accountType === "Income");
}

function ledgerPathNamesLower(ledger: ChartOfAccount, records: ChartOfAccount[]): string[] {
  return [...pathNameSet(records, ledger.id), ledger.accountName].map((n) => n.toLowerCase());
}

function namesIncludeAny(names: string[], terms: string[]): boolean {
  return terms.some((t) => names.some((n) => n.includes(t)));
}

const BANK_OD_CC_GROUP_TERMS = [
  "bank od",
  "cash credit",
  "bank od / cash credit",
  "od / cash credit",
  "overdraft",
];

function isUnderCashInHandGroup(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (resolveSpecializedGroupType(ledger, records) === "cash_in_hand") return true;
  return ledgerHasAncestorNamed(ledger, "Cash-in-Hand", records);
}

function isUnderBankAccountsGroup(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (resolveSpecializedGroupType(ledger, records) === "bank_accounts") return true;
  return ledgerHasAncestorNamed(ledger, "Bank Accounts", records);
}

function isUnderBankOdOrCashCreditGroup(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  // Receipt's approved scope keeps OD/CC under the asset-side bank hierarchy.
  if (ledger.accountType !== "Asset") return false;
  const names = ledgerPathNamesLower(ledger, records);
  if (!names.some((n) => n === "assets" || n === "current assets" || n.includes("bank od"))) {
    return false;
  }
  return namesIncludeAny(names, BANK_OD_CC_GROUP_TERMS);
}

function isPaymentOdOrCashCreditLedger(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  if (!namesIncludeAny(names, BANK_OD_CC_GROUP_TERMS)) return false;
  return (
    ledger.accountType === "Asset" ||
    ledger.accountType === "Liability" ||
    ledger.bankAccountFlag ||
    namesIncludeAny(names, ["bank account", "bank loan", "loans / borrowings"])
  );
}

/** True for posting ledgers under Cash-in-Hand, Bank Accounts, or Bank OD / Cash Credit. */
function isReceiptBankOrCashLedger(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (!isPostableNode(ledger, records)) return false;
  return (
    isUnderCashInHandGroup(ledger, records) ||
    isUnderBankAccountsGroup(ledger, records) ||
    isUnderBankOdOrCashCreditGroup(ledger, records)
  );
}

function passesBankMasterReceiptRules(
  ledger: ChartOfAccount,
  warehouseRef?: string | number | null,
): boolean {
  const master = loadBankAccountMasters().find((m) => m.coaLedgerId === ledger.id);
  if (!master) return true;
  const typeOk =
    master.accountType === "Current" ||
    master.accountType === "Savings" ||
    master.accountType === "OD" ||
    master.accountType === "CC";
  if (!typeOk) return false;
  const warehouseId = resolveWarehouseId(warehouseRef);
  if (warehouseId != null) {
    return isBankAccountMappedToWarehouse(master.mappedWarehouseIds, warehouseId, master.status);
  }
  return true;
}

/** Receipt — debit side: Cash-in-Hand, Bank Accounts, and Bank OD / Cash Credit posting ledgers only */
export function ledgerMatchesReceiptDebitScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
  warehouseRef?: string | number | null,
): boolean {
  if (!isReceiptBankOrCashLedger(ledger, records)) return false;
  if (isUnderCashInHandGroup(ledger, records)) return true;
  return passesBankMasterReceiptRules(ledger, warehouseRef);
}

function isBankCashLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (isReceiptBankOrCashLedger(ledger, records)) return true;
  return (
    ledger.bankAccountFlag ||
    ledgerHasAncestorNamed(ledger, "Bank Accounts", records) ||
    ledgerHasAncestorNamed(ledger, "Cash-in-Hand", records)
  );
}

function isCustomerLedgerScope(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return ledgerMatchesVoucherScope(ledger, "party_receivable", records);
}

function isVendorLedgerScope(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return ledgerMatchesVoucherScope(ledger, "party_payable", records);
}

function isExpenseLedgerScope(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return ledgerMatchesVoucherScope(ledger, "expense", records);
}

function isIncomeLedgerScope(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return ledgerMatchesVoucherScope(ledger, "income", records);
}

function isPurchaseOrInventoryLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  return namesIncludeAny(names, [
    "purchase account",
    "purchase accounts",
    "purchases",
    "stock-in-hand",
    "inventory",
    "stock in hand",
    "closing stock",
    "opening stock",
  ]);
}

function isDutiesTaxesLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  return (
    ledgerHasAncestorNamed(ledger, "Duties & Taxes Payable", records) ||
    ledgerHasAncestorNamed(ledger, "GST Payable", records) ||
    ledgerHasAncestorNamed(ledger, "GST Input", records) ||
    ledgerHasAncestorNamed(ledger, "GST Output", records) ||
    ledgerHasAncestorNamed(ledger, "TDS Payable", records) ||
    namesIncludeAny(names, [
      "duties & taxes",
      "gst payable",
      "gst input",
      "gst output",
      "cgst payable",
      "sgst payable",
      "igst payable",
      "tds payable",
    ])
  );
}

function isNonReceiptAssetLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  if (isCustomerLedgerScope(ledger, records)) return false;
  return (
    ledgerHasAncestorNamed(ledger, "Fixed Assets", records) ||
    ledgerHasAncestorNamed(ledger, "Investments", records) ||
    ledgerHasAncestorNamed(ledger, "Loans & Advances Given", records) ||
    ledgerHasAncestorNamed(ledger, "Inventory / Stock-in-Hand", records) ||
    ledgerHasAncestorNamed(ledger, "Prepaid Expenses", records) ||
    ledgerHasAncestorNamed(ledger, "Accrued Income", records) ||
    ledgerHasAncestorNamed(ledger, "Other Current Assets", records) ||
    ledgerHasAncestorNamed(ledger, "TDS Receivable", records) ||
    // Asset-side deposits paid (not security deposits received)
    (ledgerHasAncestorNamed(ledger, "Deposits", records) &&
      ledger.accountType === "Asset" &&
      !namesIncludeAny(names, ["security deposit received", "deposit received"]))
  );
}

/**
 * Receipt — credit side: customer, vendor refund, income, capital, loans,
 * current liabilities (advances / deposits received), and other eligible sources.
 * Primary heads / groups are never postable — only leaf ledgers.
 */
export function ledgerMatchesReceiptCreditScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): boolean {
  if (!isPostableNode(ledger, records)) return false;
  if (isBankCashLedger(ledger, records)) return false;
  if (isExpenseLedgerScope(ledger, records)) return false;
  if (isPurchaseOrInventoryLedger(ledger, records)) return false;
  if (isDutiesTaxesLedger(ledger, records)) return false;
  if (isNonReceiptAssetLedger(ledger, records)) return false;

  const names = ledgerPathNamesLower(ledger, records);

  if (isCustomerLedgerScope(ledger, records)) return true;
  if (isVendorLedgerScope(ledger, records)) return true;
  if (isIncomeLedgerScope(ledger, records)) return true;

  if (
    ledgerHasAncestorNamed(ledger, "Capital Account", records) ||
    ledger.accountType === "Equity" ||
    namesIncludeAny(names, [
      "shareholder capital",
      "partner capital",
      "proprietor",
      "reserves & surplus",
      "retained earnings",
      "equity share",
    ])
  ) {
    return !namesIncludeAny(names, ["drawing"]);
  }

  if (
    ledgerHasAncestorNamed(ledger, "Loans / Borrowings", records) ||
    namesIncludeAny(names, [
      "bank loan",
      "unsecured loan",
      "secured loan",
      "nbfc loan",
      "working capital loan",
      "cash credit",
    ])
  ) {
    return true;
  }

  if (ledgerHasAncestorNamed(ledger, "Current Liabilities", records)) {
    return true;
  }

  if (
    namesIncludeAny(names, [
      "miscellaneous income",
      "other operating income",
      "other income",
      "discount received",
      "interest income",
      "rent income",
      "commission income",
      "security deposit received",
      "deposit received",
      "customer advance",
      "advance received",
    ])
  ) {
    return true;
  }

  if (ledgerHasAncestorNamed(ledger, "Advance Received from Customers", records)) {
    return true;
  }

  // Other liability ledgers configured under Liabilities (excl. provisions handled above via CL)
  if (ledger.accountType === "Liability" && !namesIncludeAny(names, ["provision"])) {
    return true;
  }

  return false;
}

function isGstPayableLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  if (namesIncludeAny(names, ["gst input", "input tax credit", "tds receivable"])) {
    return false;
  }
  return (
    ledgerHasAncestorNamed(ledger, "GST Payable", records) ||
    ledgerHasAncestorNamed(ledger, "Duties & Taxes Payable", records) ||
    namesIncludeAny(names, ["gst payable", "cgst payable", "sgst payable", "igst payable", "output cgst", "output sgst", "output igst"])
  );
}

function isTdsPayableLedgerScope(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  return (
    ledgerHasAncestorNamed(ledger, "TDS Payable", records) ||
    namesIncludeAny(names, ["tds payable"])
  );
}

function isAdvancePaymentLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  if (namesIncludeAny(names, ["advance received"])) return false;
  return (
    ledgerHasAncestorNamed(ledger, "Loans & Advances Given", records) ||
    namesIncludeAny(names, [
      "advance to",
      "supplier advance",
      "vendor advance",
      "employee advance",
      "staff advance",
      "dealer advance",
    ])
  );
}

function isEmployeeOrOtherPaymentPayable(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  return (
    namesIncludeAny(names, [
      "employee payable",
      "salary payable",
      "staff payable",
      "expense payable",
      "expenses payable",
      "pf / esic payable",
      "pf payable",
      "esic payable",
    ]) ||
    (ledgerHasAncestorNamed(ledger, "Other Current Liabilities", records) &&
      !namesIncludeAny(names, ["advance received", "deposit received"]))
  );
}

function isLoanRepaymentLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  return (
    ledgerHasAncestorNamed(ledger, "Loans / Borrowings", records) ||
    namesIncludeAny(names, [
      "secured loan",
      "unsecured loan",
      "bank loan",
      "nbfc loan",
      "director loan",
      "related party loan",
      "term loan",
    ])
  );
}

function isDrawingsOrCapitalWithdrawalLedger(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  const names = ledgerPathNamesLower(ledger, records);
  return (
    ledgerHasAncestorNamed(ledger, "Drawings", records) ||
    namesIncludeAny(names, ["drawings", "capital withdrawal", "capital withdrawn"])
  );
}

function isAssetPaymentLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (isBankCashLedger(ledger, records)) return false;
  if (isCustomerLedgerScope(ledger, records)) return false;
  if (isVendorLedgerScope(ledger, records)) return false;
  if (isIncomeLedgerScope(ledger, records)) return false;
  if (isExpenseLedgerScope(ledger, records)) return false;

  const names = ledgerPathNamesLower(ledger, records);
  if (
    namesIncludeAny(names, [
      "trade receivable",
      "sundry debtor",
      "inventory",
      "stock-in-hand",
      "gst input",
      "tds receivable",
      "input tax credit",
    ])
  ) {
    return false;
  }

  if (ledger.accountType === "Asset") return true;
  return (
    ledgerHasAncestorNamed(ledger, "Fixed Assets", records) ||
    ledgerHasAncestorNamed(ledger, "Investments", records) ||
    ledgerHasAncestorNamed(ledger, "Deposits", records) ||
    ledgerHasAncestorNamed(ledger, "Other Current Assets", records)
  );
}

/**
 * Payment — debit side: the final active ledger representing why money is paid.
 * Includes ERP-synced vendors/customers, expenses, assets and advances, statutory
 * and employee payables, loan repayments, and drawings/capital withdrawals.
 */
export function ledgerMatchesPaymentDebitScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): boolean {
  if (!isPostableNode(ledger, records)) return false;
  if (isBankCashLedger(ledger, records)) return false;
  if (isIncomeLedgerScope(ledger, records)) return false;

  return (
    isVendorLedgerScope(ledger, records) ||
    isCustomerLedgerScope(ledger, records) ||
    isExpenseLedgerScope(ledger, records) ||
    isAssetPaymentLedger(ledger, records) ||
    isGstPayableLedger(ledger, records) ||
    isTdsPayableLedgerScope(ledger, records) ||
    isAdvancePaymentLedger(ledger, records) ||
    isEmployeeOrOtherPaymentPayable(ledger, records) ||
    isLoanRepaymentLedger(ledger, records) ||
    isDrawingsOrCapitalWithdrawalLedger(ledger, records)
  );
}

export function validateReceiptVoucherLedgerScopes(
  bankCashLedgerId: number | null,
  partyLedgerId: number | null,
  records = loadChartOfAccounts(),
): string | null {
  if (!bankCashLedgerId) return null;
  const bank = records.find((r) => r.id === bankCashLedgerId);
  if (!bank) return "Account (Dr) is not a valid ledger.";
  if (!isPostableNode(bank, records)) {
    return "Account (Dr) must be a posting ledger — groups cannot be selected.";
  }
  if (!ledgerMatchesReceiptDebitScope(bank, records)) {
    return "Account (Dr) must be a Cash, Bank, Bank OD, or Cash Credit ledger.";
  }
  if (!partyLedgerId) return null;
  if (bankCashLedgerId === partyLedgerId) {
    return "Account (Dr) and Account (Cr) cannot be the same.";
  }
  const party = records.find((r) => r.id === partyLedgerId);
  if (!party) return "Account (Cr) is not a valid ledger.";
  if (!isPostableNode(party, records)) {
    return "Account (Cr) must be a posting ledger — groups cannot be selected.";
  }
  if (!ledgerMatchesReceiptCreditScope(party, records)) {
    return "Account (Cr) must be a customer, vendor refund, income, capital, loan, or liability ledger.";
  }
  if (ledgerMatchesReceiptDebitScope(party, records)) {
    return "Account (Cr) cannot be a Cash, Bank, Bank OD, or Cash Credit ledger.";
  }
  return null;
}

/** Payment — credit side: Bank Accounts, Cash-in-Hand, OD and CC (same as receipt debit scope). */
export function ledgerMatchesPaymentCreditScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
  warehouseRef?: string | number | null,
): boolean {
  if (!isPostableNode(ledger, records)) return false;
  if (ledgerMatchesReceiptDebitScope(ledger, records, warehouseRef)) return true;
  if (ledger.bankAccountFlag && passesBankMasterReceiptRules(ledger, warehouseRef)) return true;
  return isPaymentOdOrCashCreditLedger(ledger, records);
}

/**
 * Contra — both debit and credit: active posting ledgers under Cash-in-Hand,
 * Bank Accounts, Bank OD, or Cash Credit only.
 */
export function ledgerMatchesContraScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
  warehouseRef?: string | number | null,
): boolean {
  return ledgerMatchesPaymentCreditScope(ledger, records, warehouseRef);
}

export function validatePaymentVoucherLedgerScopes(
  bankCashLedgerId: number | null,
  partyLedgerId: number | null,
  expenseHeadLedgerId: number | null,
  records = loadChartOfAccounts(),
): string | null {
  if (!bankCashLedgerId) return null;
  const bank = records.find((r) => r.id === bankCashLedgerId);
  if (!bank) return "Payment Account is not a valid ledger.";
  if (!isPostableNode(bank, records)) {
    return "Account (Cr) must be a final active ledger — groups cannot be selected.";
  }
  if (!ledgerMatchesPaymentCreditScope(bank, records)) {
    return "Account (Cr) must be a Cash, Bank, Bank OD, or Cash Credit ledger.";
  }
  const debitId = expenseHeadLedgerId ?? partyLedgerId;
  if (!debitId) return null;
  if (bankCashLedgerId === debitId) {
    return "Account (Dr) and Account (Cr) cannot be the same.";
  }
  const debit = records.find((r) => r.id === debitId);
  if (!debit) return "Account (Dr) is not a valid ledger.";
  if (!isPostableNode(debit, records)) {
    return "Account (Dr) must be a final active ledger — groups cannot be selected.";
  }
  if (!ledgerMatchesPaymentDebitScope(debit, records)) {
    return "Account (Dr) must be a valid vendor, customer refund, expense, asset, advance, statutory payable, employee payable, loan, or drawings ledger.";
  }
  if (ledgerMatchesPaymentCreditScope(debit, records)) {
    return "Account (Dr) cannot be a Cash, Bank, Bank OD, or Cash Credit ledger.";
  }
  return null;
}

export function validateContraVoucherLedgerScopes(
  fromLedgerId: number | null,
  toLedgerId: number | null,
  records = loadChartOfAccounts(),
): string | null {
  if (toLedgerId) {
    const debit = records.find((r) => r.id === toLedgerId);
    if (!debit) return "Account (Dr) is not a valid ledger.";
    if (!isPostableNode(debit, records)) {
      return "Account (Dr) must be a final active ledger — groups cannot be selected.";
    }
    if (!ledgerMatchesContraScope(debit, records)) {
      return "Account (Dr) must be a Cash, Bank, Bank OD, or Cash Credit ledger.";
    }
  }
  if (fromLedgerId) {
    const credit = records.find((r) => r.id === fromLedgerId);
    if (!credit) return "Account (Cr) is not a valid ledger.";
    if (!isPostableNode(credit, records)) {
      return "Account (Cr) must be a final active ledger — groups cannot be selected.";
    }
    if (!ledgerMatchesContraScope(credit, records)) {
      return "Account (Cr) must be a Cash, Bank, Bank OD, or Cash Credit ledger.";
    }
  }
  if (fromLedgerId && toLedgerId && fromLedgerId === toLedgerId) {
    return "Account (Dr) and Account (Cr) cannot be the same.";
  }
  return null;
}

/** Filter ledgers shown in voucher dropdown by line context */
export function ledgerMatchesVoucherScope(
  ledger: ChartOfAccount,
  scope: VoucherLedgerScope | undefined,
  records = loadChartOfAccounts(),
): boolean {
  if (!isPostableNode(ledger, records)) return false;
  if (!scope) return true;

  switch (scope) {
    case "bank_cash":
      return (
        ledger.bankAccountFlag ||
        ledgerHasAncestorNamed(ledger, "Bank Accounts", records) ||
        ledgerHasAncestorNamed(ledger, "Cash-in-Hand", records)
      );
    case "receipt_debit":
      return ledgerMatchesReceiptDebitScope(ledger, records);
    case "payment_credit":
      return ledgerMatchesPaymentCreditScope(ledger, records);
    case "party_receivable":
      return (
        ledgerHasAncestorNamed(ledger, "Trade Receivables / Sundry Debtors", records) ||
        ledger.erpSourceModule === "customer_master"
      );
    case "party_payable":
      return (
        ledgerHasAncestorNamed(ledger, "Trade Payables / Sundry Creditors", records) ||
        ledger.erpSourceModule === "vendor_master"
      );
    case "expense":
      return ledger.accountType === "Expense" || ledgerUnderExpense(ledger, records);
    case "income":
      return ledger.accountType === "Income" || ledgerUnderIncome(ledger, records);
    case "tax":
      return ledgerHasAncestorNamed(ledger, "Duties & Taxes Payable", records);
    case "loan_advance":
      return (
        ledgerHasAncestorNamed(ledger, "Loans & Advances", records) ||
        ledgerHasAncestorNamed(ledger, "Loans / Borrowings", records)
      );
    case "receipt_credit":
      return ledgerMatchesReceiptCreditScope(ledger, records);
    case "payment_debit":
      return ledgerMatchesPaymentDebitScope(ledger, records);
    default:
      return true;
  }
}

/** Infer dropdown scope from voucher type and line debit/credit side */
export function resolveVoucherLineScope(
  voucherType: VoucherTypeCode,
  line: Pick<VoucherLine, "debit" | "credit">,
): VoucherLedgerScope | undefined {
  if (voucherType !== "receipt" && voucherType !== "payment") return undefined;
  const debit = Number(line.debit) || 0;
  const credit = Number(line.credit) || 0;

  if (voucherType === "receipt") {
    if (debit > 0 && credit === 0) return "receipt_debit";
    if (credit > 0 && debit === 0) return "receipt_credit";
  }
  if (voucherType === "payment") {
    if (debit > 0 && credit === 0) return "payment_debit";
    if (credit > 0 && debit === 0) return "bank_cash";
  }
  return undefined;
}

export function validateVoucherQuickAddLedgerForm(
  form: LedgerFormValues,
  records: ChartOfAccount[],
): string | null {
  if (!form.ledgerName.trim()) return "Sub group ledger name is required.";
  if (!form.parentGroupId) return "Under ledger group is required.";
  const parent = records.find((r) => r.id === form.parentGroupId);
  if (!parent || !canVoucherQuickAddLedgerUnder(parent, records)) {
    return "Select a valid parent group or sub-group for this ledger.";
  }
  const dup = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.parentAccountId === form.parentGroupId &&
      r.accountName.toLowerCase() === form.ledgerName.trim().toLowerCase(),
  );
  if (dup) return "A ledger with this name already exists under the selected parent.";
  return null;
}

/** Persist a new COA ledger from voucher quick-add (sub group ledger under selected group) */
export function createVoucherQuickAddLedger(form: LedgerFormValues): ChartOfAccount {
  const records = loadChartOfAccounts();
  const err = validateVoucherQuickAddLedgerForm(form, records);
  if (err) throw new Error(err);

  const parent = records.find((r) => r.id === form.parentGroupId)!;
  const pathNames = [...getAncestorPath(records, parent.id), parent].map((n) => n.accountName);
  const isBankParent = pathNames.some((n) => n === "Bank Accounts");

  const normalized: LedgerFormValues = {
    ...form,
    ledgerName: form.ledgerName.trim(),
    bankAccountFlag: isBankParent || form.bankAccountFlag,
    balanceType:
      form.balanceType ||
      defaultBalanceTypeForParent(records, form.parentGroupId),
  };

  const ledgers = getCoaLedgers();
  const id = nextId(ledgers);
  const ledger = formToLedger(normalized, id, generateLedgerCode(records), records);
  saveChartOfAccounts([...records, ledger]);
  dispatchAccountsDataChanged("ledgers", {
    operation: "create",
    recordId: ledger.id,
  });
  return ledger;
}
