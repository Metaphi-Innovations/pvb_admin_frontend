/**
 * Dynamic accounting preview for bank reconciliation categorization.
 */

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { roundMoney } from "@/lib/accounts/money-format";
import { resolveCoaLedgerForV2BankAccount } from "@/lib/accounts/bank-recon-account-bridge";
import type {
  AccountingPreviewLine,
  BankReconCategorizeFormInput,
} from "@/lib/accounts/bank-recon-categorize-types";
import { isDepositCategory } from "@/lib/accounts/bank-recon-categorize-types";

function ledgerName(id: number | null | undefined): string {
  if (!id) return "—";
  return loadChartOfAccounts().find((l) => l.id === id)?.accountName ?? `Ledger #${id}`;
}

export function buildCategorizeAccountingPreview(
  input: BankReconCategorizeFormInput,
  partyLedgerName = "Party / Ledger",
): AccountingPreviewLine[] {
  const bankLedger = resolveCoaLedgerForV2BankAccount(input.bankAccountId);
  const bankName = bankLedger?.accountName ?? "Bank Account";
  const bankNet = roundMoney(input.bankAmount);
  const gross = roundMoney(input.accountAmount);
  const charges = roundMoney(input.bankChargesAmount ?? 0);
  const tds = roundMoney(input.tdsAmount ?? 0);
  const isDeposit = isDepositCategory(input.category);

  if (input.category === "bank_transfer") {
    const fromName = bankName;
    const toName = ledgerName(input.toBankLedgerId);
    return [
      { ledgerName: toName, debit: bankNet, credit: 0, note: "Transfer To (Dr)" },
      { ledgerName: fromName, debit: 0, credit: bankNet, note: "Transfer From (Cr)" },
    ];
  }

  if (isDeposit) {
    const lines: AccountingPreviewLine[] = [];
    if (input.category === "customer_receipt" && charges > 0) {
      lines.push({ ledgerName: bankName, debit: bankNet, credit: 0 });
      lines.push({
        ledgerName: ledgerName(input.bankChargesLedgerId) || "Bank Charges",
        debit: charges,
        credit: 0,
      });
      lines.push({ ledgerName: partyLedgerName, debit: 0, credit: gross });
      return lines;
    }
    lines.push({ ledgerName: bankName, debit: bankNet, credit: 0 });
    if (tds > 0) {
      lines.push({ ledgerName: ledgerName(input.tdsLedgerId) || "TDS Receivable", debit: tds, credit: 0 });
    }
    lines.push({ ledgerName: partyLedgerName, debit: 0, credit: gross + tds });
    return lines;
  }

  const expenseName =
    input.category === "expense" || input.category === "bank_charges"
      ? ledgerName(input.ledgerId) || partyLedgerName
      : partyLedgerName;

  const lines: AccountingPreviewLine[] = [
    { ledgerName: expenseName, debit: gross, credit: 0 },
  ];
  if (tds > 0) {
    lines.push({ ledgerName: ledgerName(input.tdsLedgerId) || "TDS Payable", debit: 0, credit: tds });
  }
  lines.push({ ledgerName: bankName, debit: 0, credit: bankNet });
  return lines;
}

export function previewIsBalanced(lines: AccountingPreviewLine[]): boolean {
  const dr = roundMoney(lines.reduce((s, l) => s + l.debit, 0));
  const cr = roundMoney(lines.reduce((s, l) => s + l.credit, 0));
  return Math.abs(dr - cr) <= 0.009 && dr > 0;
}
