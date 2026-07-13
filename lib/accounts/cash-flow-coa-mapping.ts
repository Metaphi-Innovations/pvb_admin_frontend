/**
 * Cash Flow line classification from Chart of Accounts hierarchy.
 * Uses primary head, account group, sub group and specializedGroupType — not ledger names.
 */

import type { ChartOfAccount, CoaSpecializedGroupType } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { resolveTrialBalanceLedgerCoaPlacement } from "@/lib/accounts/trial-balance-coa-hierarchy";

/** Statement line ids — layout keys matching the client Excel structure. */
export type CashFlowLineId =
  | "cash-from-customers"
  | "other-operating-receipts"
  | "cash-paid-suppliers"
  | "cash-paid-employees"
  | "operating-expenses"
  | "gst-paid"
  | "interest-paid"
  | "income-tax-paid"
  | "purchase-fixed-assets"
  | "sale-fixed-assets"
  | "investment-purchase"
  | "investment-sale"
  | "capital-introduced"
  | "loan-received"
  | "loan-repaid"
  | "dividend-paid";

/** Fixed accounting sequence — never sort alphabetically. */
export const CASH_FLOW_LINE_ORDER: CashFlowLineId[] = [
  "cash-from-customers",
  "cash-paid-suppliers",
  "cash-paid-employees",
  "gst-paid",
  "interest-paid",
  "income-tax-paid",
  "other-operating-receipts",
  "operating-expenses",
  "purchase-fixed-assets",
  "sale-fixed-assets",
  "investment-purchase",
  "investment-sale",
  "capital-introduced",
  "loan-received",
  "loan-repaid",
  "dividend-paid",
];

/** Lines shown under Operating Activities (client Excel). */
export const CASH_FLOW_OPERATING_DISPLAY_IDS: CashFlowLineId[] = [
  "cash-from-customers",
  "cash-paid-suppliers",
  "cash-paid-employees",
  "gst-paid",
  "interest-paid",
  "income-tax-paid",
];

/** Lines shown under Investing Activities (client Excel). */
export const CASH_FLOW_INVESTING_DISPLAY_IDS: CashFlowLineId[] = [
  "purchase-fixed-assets",
  "sale-fixed-assets",
  "investment-purchase",
  "investment-sale",
];

/** Lines shown under Financing Activities (client Excel). */
export const CASH_FLOW_FINANCING_DISPLAY_IDS: CashFlowLineId[] = [
  "capital-introduced",
  "loan-received",
  "loan-repaid",
  "dividend-paid",
];

/** All operating line ids included in net operating total. */
export const CASH_FLOW_OPERATING_TOTAL_IDS: CashFlowLineId[] = [
  ...CASH_FLOW_OPERATING_DISPLAY_IDS,
  "other-operating-receipts",
  "operating-expenses",
];

export const CASH_FLOW_LINE_LABELS: Record<CashFlowLineId, string> = {
  "cash-from-customers": "Cash Received from Customers",
  "other-operating-receipts": "Other Operating Receipts",
  "cash-paid-suppliers": "Cash Paid to Suppliers",
  "cash-paid-employees": "Cash Paid to Employees",
  "operating-expenses": "Operating Expenses Paid",
  "gst-paid": "GST Paid",
  "interest-paid": "Interest Paid",
  "income-tax-paid": "Income Tax Paid",
  "purchase-fixed-assets": "Purchase of Fixed Assets",
  "sale-fixed-assets": "Sale of Fixed Assets",
  "investment-purchase": "Investment Purchase",
  "investment-sale": "Investment Sale",
  "capital-introduced": "Capital Introduced",
  "loan-received": "Loan Received",
  "loan-repaid": "Loan Repaid",
  "dividend-paid": "Dividend Paid",
};

const OPERATING_LINE_IDS = new Set<CashFlowLineId>(CASH_FLOW_OPERATING_TOTAL_IDS);

const INVESTING_LINE_IDS = new Set<CashFlowLineId>(CASH_FLOW_INVESTING_DISPLAY_IDS);

const FINANCING_LINE_IDS = new Set<CashFlowLineId>(CASH_FLOW_FINANCING_DISPLAY_IDS);

export type CashFlowActivitySection = "operating" | "investing" | "financing";

export function cashFlowLineSection(lineId: CashFlowLineId): CashFlowActivitySection {
  if (OPERATING_LINE_IDS.has(lineId)) return "operating";
  if (INVESTING_LINE_IDS.has(lineId)) return "investing";
  return "financing";
}

function collectSpecializedTypes(
  ledgerId: number,
  records: ChartOfAccount[],
): Set<CoaSpecializedGroupType> {
  const types = new Set<CoaSpecializedGroupType>();
  for (const node of getAncestorPath(records, ledgerId)) {
    if (node.specializedGroupType) types.add(node.specializedGroupType);
  }
  return types;
}

function isCashOrBankLedger(ledgerId: number, records: ChartOfAccount[]): boolean {
  const types = collectSpecializedTypes(ledgerId, records);
  return types.has("cash_in_hand") || types.has("bank_accounts");
}

function subGroupMatches(subGroupName: string, ...needles: string[]): boolean {
  const sg = subGroupName.trim().toLowerCase();
  return needles.some((n) => sg === n.trim().toLowerCase());
}

function accountGroupMatches(accountGroupName: string, ...needles: string[]): boolean {
  const ag = accountGroupName.trim().toLowerCase();
  return needles.some((n) => ag === n.trim().toLowerCase());
}

/**
 * Classify a non-cash counterparty ledger into a cash-flow statement line.
 * @param counterpartySide Debit or Credit side of the counterparty voucher line.
 */
export function classifyCashFlowLine(
  ledgerId: number,
  counterpartySide: "Debit" | "Credit",
  records: ChartOfAccount[],
): CashFlowLineId | null {
  if (isCashOrBankLedger(ledgerId, records)) return null;

  const placement = resolveTrialBalanceLedgerCoaPlacement(ledgerId, records);
  if (!placement) return null;

  const { primaryHead, accountGroup, subGroup } = placement;
  const specTypes = collectSpecializedTypes(ledgerId, records);
  const ag = accountGroup.accountName;
  const sg = subGroup.accountName;
  const ph = primaryHead.accountName;

  // ── Investing ──────────────────────────────────────────────────────────────
  if (accountGroupMatches(ag, "Fixed Assets")) {
    return counterpartySide === "Debit" ? "purchase-fixed-assets" : "sale-fixed-assets";
  }
  if (accountGroupMatches(ag, "Investments")) {
    return counterpartySide === "Debit" ? "investment-purchase" : "investment-sale";
  }
  if (
    ph === "Income" &&
    accountGroupMatches(ag, "Indirect Income") &&
    subGroupMatches(sg, "Profit on Sale of Asset")
  ) {
    return "sale-fixed-assets";
  }

  // ── Financing ──────────────────────────────────────────────────────────────
  if (accountGroupMatches(ag, "Capital Account")) {
    if (subGroupMatches(sg, "Drawings")) return "dividend-paid";
    return counterpartySide === "Credit" ? "capital-introduced" : "dividend-paid";
  }
  if (accountGroupMatches(ag, "Loans / Borrowings")) {
    return counterpartySide === "Credit" ? "loan-received" : "loan-repaid";
  }

  // ── Operating — interest (shown under operating activities) ────────────────
  if (
    ph === "Expenses" &&
    accountGroupMatches(ag, "Indirect Expenses") &&
    subGroupMatches(sg, "Interest Expense", "Finance Costs", "Bank Charges")
  ) {
    return "interest-paid";
  }

  // ── Operating — statutory / tax ────────────────────────────────────────────
  if (
    specTypes.has("gst_output") ||
    specTypes.has("gst_payable") ||
    specTypes.has("tds_payable") ||
    specTypes.has("gst_duties") ||
    (accountGroupMatches(ag, "Current Liabilities") &&
      subGroupMatches(
        sg,
        "Duties & Taxes Payable",
        "GST Payable",
        "TDS Payable",
        "PF / ESIC Payable",
      ))
  ) {
    return "gst-paid";
  }
  if (
    accountGroupMatches(ag, "Provisions") &&
    subGroupMatches(sg, "Provision for Tax")
  ) {
    return "income-tax-paid";
  }
  if (ph === "Expenses" && subGroupMatches(sg, "GST Late Fees / Penalty", "TDS Late Fees / Penalty")) {
    return "gst-paid";
  }

  // ── Operating — customers / suppliers / employees ──────────────────────────
  if (specTypes.has("sundry_debtors")) return "cash-from-customers";
  if (subGroupMatches(sg, "Advance Received from Customers")) return "cash-from-customers";

  if (specTypes.has("sundry_creditors")) return "cash-paid-suppliers";
  if (specTypes.has("employee_payable")) return "cash-paid-employees";
  if (
    ph === "Expenses" &&
    accountGroupMatches(ag, "Indirect Expenses", "Employee Costs")
  ) {
    return "cash-paid-employees";
  }
  if (ph === "Expenses" && subGroupMatches(sg, "Salaries & Wages", "Bonus", "Incentives")) {
    return "cash-paid-employees";
  }

  // ── Dividend / distributions ───────────────────────────────────────────────
  if (
    ph === "Income" &&
    accountGroupMatches(ag, "Indirect Income") &&
    subGroupMatches(sg, "Dividend Income")
  ) {
    return "dividend-paid";
  }

  // ── Operating — other income ───────────────────────────────────────────────
  if (ph === "Income") {
    if (
      accountGroupMatches(ag, "Indirect Income") &&
      subGroupMatches(sg, "Interest Income")
    ) {
      return "other-operating-receipts";
    }
    return "other-operating-receipts";
  }

  // ── Operating — expenses ───────────────────────────────────────────────────
  if (ph === "Expenses") {
    if (accountGroupMatches(ag, "Direct Expenses")) return "operating-expenses";
    if (accountGroupMatches(ag, "Indirect Expenses")) {
      if (subGroupMatches(sg, "Interest Expense", "Finance Costs", "Bank Charges")) {
        return "interest-paid";
      }
      return "operating-expenses";
    }
    return "operating-expenses";
  }

  // ── Working capital / other balance-sheet movements ────────────────────────
  if (ph === "Assets") {
    if (specTypes.has("inventory")) return "operating-expenses";
    return counterpartySide === "Debit" ? "operating-expenses" : "other-operating-receipts";
  }
  if (ph === "Liabilities") {
    return counterpartySide === "Credit" ? "other-operating-receipts" : "operating-expenses";
  }

  return "other-operating-receipts";
}
