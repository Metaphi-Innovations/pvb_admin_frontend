import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  isPostableNode,
  ledgerHasAncestorNamed,
} from "@/lib/accounts/coa-hierarchy";
import type { BankCategorization } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";

export type BankReconCoaScope =
  | "expense"
  | "income"
  | "asset"
  | "liability"
  | "bank_cash";

function isActivePostable(ledger: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return ledger.status === "active" && isPostableNode(ledger, records);
}

export function ledgerMatchesBankReconScope(
  ledger: ChartOfAccount,
  scope: BankReconCoaScope,
  records = loadChartOfAccounts(),
): boolean {
  if (!isActivePostable(ledger, records)) return false;

  switch (scope) {
    case "expense":
      return ledger.accountType === "Expense";
    case "income":
      return ledger.accountType === "Income";
    case "asset":
      return ledger.accountType === "Asset";
    case "liability":
      return ledger.accountType === "Liability";
    case "bank_cash":
      return (
        ledger.bankAccountFlag ||
        ledgerHasAncestorNamed(ledger, "Bank Accounts", records) ||
        ledgerHasAncestorNamed(ledger, "Cash-in-Hand", records)
      );
    default:
      return false;
  }
}

/** Map bank reconciliation category to COA tree scope for the ledger picker. */
export function resolveBankReconCoaScope(
  category: BankCategorization | "",
): BankReconCoaScope | null {
  switch (category) {
    case "expense":
    case "bank_charges":
    case "employee_claim_payment":
      return "expense";
    case "interest_income":
      return "income";
    case "transfer":
      return "bank_cash";
    case "vendor_payment":
      return "liability";
    default:
      return null;
  }
}

export function bankReconLedgerFilterForCategory(
  category: BankCategorization | "",
): ((ledger: ChartOfAccount) => boolean) | undefined {
  const scope = resolveBankReconCoaScope(category);
  if (!scope) return undefined;
  const records = loadChartOfAccounts();
  return (ledger) => ledgerMatchesBankReconScope(ledger, scope, records);
}

export function bankReconLedgerFieldLabel(category: BankCategorization | ""): string {
  const scope = resolveBankReconCoaScope(category);
  switch (scope) {
    case "expense":
      return "Expense Account";
    case "income":
      return "Income Ledger";
    case "asset":
      return "Asset Account";
    case "liability":
      return "Liability Account";
    case "bank_cash":
      return "Transfer To (Bank / Cash)";
    default:
      return "Account";
  }
}
