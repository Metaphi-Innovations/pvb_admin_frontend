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
import type { VoucherLine, VoucherTypeCode } from "@/app/(app)/accounts/vouchers/voucher-data";

/** Ledger picker / quick-add context for Receipt & Payment vouchers only */
export type VoucherLedgerScope =
  | "bank_cash"
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
        matchesIncomeParent(node, records) ||
        matchesLoanAdvanceParent(node, records)
      );
    case "payment_debit":
      return (
        matchesPayableParent(node, records) ||
        matchesExpenseParent(node, records) ||
        matchesTaxParent(node, records) ||
        matchesLoanAdvanceParent(node, records)
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
      return (
        ledgerMatchesVoucherScope(ledger, "party_receivable", records) ||
        ledgerMatchesVoucherScope(ledger, "income", records) ||
        ledgerMatchesVoucherScope(ledger, "loan_advance", records)
      );
    case "payment_debit":
      return (
        ledgerMatchesVoucherScope(ledger, "party_payable", records) ||
        ledgerMatchesVoucherScope(ledger, "expense", records) ||
        ledgerMatchesVoucherScope(ledger, "tax", records) ||
        ledgerMatchesVoucherScope(ledger, "loan_advance", records)
      );
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
    if (debit > 0 && credit === 0) return "bank_cash";
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
