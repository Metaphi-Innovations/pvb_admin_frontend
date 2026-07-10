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
import {
  isBankAccountLedger,
  isUnderBankAccounts,
} from "@/lib/accounts/bank-coa-utils";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";
import type { VoucherLine, VoucherTypeCode } from "@/app/(app)/accounts/vouchers/voucher-data";

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

/** Receipt — debit side: Bank Accounts, Cash-in-Hand, OD and CC accounts only */
export function ledgerMatchesReceiptDebitScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): boolean {
  if (!isPostableNode(ledger, records)) return false;

  if (ledgerHasAncestorNamed(ledger, "Cash-in-Hand", records)) {
    return true;
  }

  if (isBankAccountLedger(ledger) && isUnderBankAccounts(ledger, records)) {
    const master = loadBankAccountMasters().find((m) => m.coaLedgerId === ledger.id);
    if (master) {
      return (
        master.accountType === "Current" ||
        master.accountType === "Savings" ||
        master.accountType === "OD" ||
        master.accountType === "CC"
      );
    }
    return true;
  }

  return false;
}

function isBankCashLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return (
    ledgerMatchesReceiptDebitScope(ledger, records) ||
    ledgerMatchesVoucherScope(ledger, "bank_cash", records)
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

/** Receipt — credit side: Customer, Vendor (refunds), Income, Capital, Loan, Security Deposit, Other Receipt */
export function ledgerMatchesReceiptCreditScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): boolean {
  if (!isPostableNode(ledger, records)) return false;
  if (isBankCashLedger(ledger, records)) return false;
  if (isExpenseLedgerScope(ledger, records)) return false;
  if (isPurchaseOrInventoryLedger(ledger, records)) return false;

  const names = ledgerPathNamesLower(ledger, records);

  if (isCustomerLedgerScope(ledger, records)) return true;
  if (isVendorLedgerScope(ledger, records)) return true;
  if (isIncomeLedgerScope(ledger, records)) return true;

  if (
    ledgerHasAncestorNamed(ledger, "Capital Account", records) ||
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
    ledgerHasAncestorNamed(ledger, "Loans & Advances Given", records) ||
    namesIncludeAny(names, ["bank loan", "unsecured loan", "secured loan", "nbfc loan", "working capital loan"])
  ) {
    return true;
  }

  if (
    ledgerHasAncestorNamed(ledger, "Deposits", records) ||
    namesIncludeAny(names, ["security deposit", "refundable security deposit"])
  ) {
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
    ])
  ) {
    return true;
  }

  if (
    ledgerHasAncestorNamed(ledger, "Advance Received from Customers", records) ||
    namesIncludeAny(names, ["advance received"])
  ) {
    return true;
  }

  return false;
}

function isGstPayableLedger(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  const names = ledgerPathNamesLower(ledger, records);
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
    namesIncludeAny(names, ["advance to", "supplier advance", "staff advance", "dealer advance"])
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

/** Payment — debit side: Vendor, Expense, Asset, GST Payable, TDS Payable, Advance */
export function ledgerMatchesPaymentDebitScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): boolean {
  if (!isPostableNode(ledger, records)) return false;
  if (isBankCashLedger(ledger, records)) return false;
  if (isCustomerLedgerScope(ledger, records)) return false;
  if (isIncomeLedgerScope(ledger, records)) return false;

  return (
    isVendorLedgerScope(ledger, records) ||
    isExpenseLedgerScope(ledger, records) ||
    isAssetPaymentLedger(ledger, records) ||
    isGstPayableLedger(ledger, records) ||
    isTdsPayableLedgerScope(ledger, records) ||
    isAdvancePaymentLedger(ledger, records)
  );
}

export function validateReceiptVoucherLedgerScopes(
  bankCashLedgerId: number | null,
  partyLedgerId: number | null,
  records = loadChartOfAccounts(),
): string | null {
  if (!bankCashLedgerId) return null;
  const bank = records.find((r) => r.id === bankCashLedgerId);
  if (!bank) return "Receipt Account is not a valid ledger.";
  if (!ledgerMatchesReceiptDebitScope(bank, records)) {
    return "Receipt Account must be Bank, Cash-in-Hand, OD, or CC ledger only.";
  }
  if (!partyLedgerId) return null;
  if (bankCashLedgerId === partyLedgerId) {
    return "Receipt Account and Ledger cannot be the same.";
  }
  const party = records.find((r) => r.id === partyLedgerId);
  if (!party) return "Ledger is not a valid account.";
  if (!ledgerMatchesReceiptCreditScope(party, records)) {
    return "Ledger must be Customer, Vendor Refund, Income, Capital, Advance Received, or other applicable receipt ledger.";
  }
  if (ledgerMatchesReceiptDebitScope(party, records)) {
    return "Ledger cannot be a Bank, Cash, OD, or CC account.";
  }
  return null;
}

/** Payment — credit side: Bank Accounts, Cash-in-Hand, OD and CC (same as receipt debit scope). */
export function ledgerMatchesPaymentCreditScope(
  ledger: ChartOfAccount,
  records = loadChartOfAccounts(),
): boolean {
  return ledgerMatchesReceiptDebitScope(ledger, records);
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
  if (!ledgerMatchesPaymentCreditScope(bank, records)) {
    return "Payment Account must be Bank, Cash-in-Hand, OD, or CC ledger only.";
  }
  const debitId = expenseHeadLedgerId ?? partyLedgerId;
  if (!debitId) return null;
  if (bankCashLedgerId === debitId) {
    return "Payment Account and Ledger cannot be the same.";
  }
  const debit = records.find((r) => r.id === debitId);
  if (!debit) return "Ledger is not a valid account.";
  if (!ledgerMatchesPaymentDebitScope(debit, records)) {
    return "Ledger must be Vendor, Expense, Employee Payable, Advance, Loan, Statutory, or other applicable payment ledger.";
  }
  if (ledgerMatchesPaymentCreditScope(debit, records)) {
    return "Ledger cannot be a Bank, Cash, OD, or CC account.";
  }
  return null;
}

export function validateContraVoucherLedgerScopes(
  fromLedgerId: number | null,
  toLedgerId: number | null,
  records = loadChartOfAccounts(),
): string | null {
  if (fromLedgerId) {
    const from = records.find((r) => r.id === fromLedgerId);
    if (!from) return "Transfer From account is not a valid ledger.";
    if (!isBankCashLedger(from, records)) {
      return "Transfer From must be a Bank or Cash ledger only.";
    }
  }
  if (toLedgerId) {
    const to = records.find((r) => r.id === toLedgerId);
    if (!to) return "Transfer To account is not a valid ledger.";
    if (!isBankCashLedger(to, records)) {
      return "Transfer To must be a Bank or Cash ledger only.";
    }
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
  return ledger;
}
