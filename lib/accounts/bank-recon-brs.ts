/**
 * Manual Bank Reconciliation Statement (BRS) — books-only (no uploaded statement).
 *
 * Current / asset:
 *   Expected = Books + Unreconciled Withdrawals − Unreconciled Deposits
 *
 * Cash Credit / OD (utilization-positive):
 *   Expected = Books − Unreconciled Withdrawals + Unreconciled Deposits
 *   (drawdown raises utilization; repayment lowers it)
 */

import type { BankReconBrsSummary } from "@/lib/accounts/bank-recon-tally-types";
import { roundMoney } from "@/lib/accounts/money-format";

export interface BrsInputLine {
  deposit: number;
  withdrawal: number;
  reconciled: boolean;
}

export type ManualBrsBalanceSign = "asset" | "cash_credit";

/**
 * Manual BRS (client phase — no statement closing / bank-only lines).
 */
export function computeManualBrsSummary(input: {
  balanceAsPerBooks: number;
  unreconciledBookLines: BrsInputLine[];
  balanceSign: ManualBrsBalanceSign;
  reconciledCount: number;
  pendingCount: number;
}): BankReconBrsSummary {
  const unreconciledDeposits = roundMoney(
    input.unreconciledBookLines.reduce((s, l) => s + (l.deposit || 0), 0),
  );
  const unreconciledWithdrawals = roundMoney(
    input.unreconciledBookLines.reduce((s, l) => s + (l.withdrawal || 0), 0),
  );

  const expectedBalanceAsPerBank =
    input.balanceSign === "cash_credit"
      ? roundMoney(
          input.balanceAsPerBooks - unreconciledWithdrawals + unreconciledDeposits,
        )
      : roundMoney(
          input.balanceAsPerBooks + unreconciledWithdrawals - unreconciledDeposits,
        );

  return {
    balanceAsPerBooks: roundMoney(input.balanceAsPerBooks),
    depositsInTransit: unreconciledDeposits,
    paymentsNotDebited: unreconciledWithdrawals,
    unreconciledDeposits,
    unreconciledWithdrawals,
    bankOnlyDeposits: 0,
    bankOnlyWithdrawals: 0,
    expectedBalanceAsPerBank,
    closingBalanceAsPerStatement: 0,
    finalDifference: 0,
    reconciledCount: input.reconciledCount,
    pendingCount: input.pendingCount,
    balanceSign: input.balanceSign,
  };
}

/**
 * @deprecated Prefer computeManualBrsSummary for the client manual workflow.
 * Kept for any leftover statement-oriented callers.
 */
export function computeBrsSummary(input: {
  balanceAsPerBooks: number;
  unreconciledBookLines: BrsInputLine[];
  bankOnlyLines: BrsInputLine[];
  closingBalanceAsPerStatement: number;
}): BankReconBrsSummary {
  const depositsInTransit = roundMoney(
    input.unreconciledBookLines.reduce((s, l) => s + (l.deposit || 0), 0),
  );
  const paymentsNotDebited = roundMoney(
    input.unreconciledBookLines.reduce((s, l) => s + (l.withdrawal || 0), 0),
  );
  const bankOnlyDeposits = roundMoney(
    input.bankOnlyLines.reduce((s, l) => s + (l.deposit || 0), 0),
  );
  const bankOnlyWithdrawals = roundMoney(
    input.bankOnlyLines.reduce((s, l) => s + (l.withdrawal || 0), 0),
  );

  const expectedBalanceAsPerBank = roundMoney(
    input.balanceAsPerBooks +
      depositsInTransit -
      paymentsNotDebited +
      bankOnlyDeposits -
      bankOnlyWithdrawals,
  );

  const closing = roundMoney(input.closingBalanceAsPerStatement);
  return {
    balanceAsPerBooks: roundMoney(input.balanceAsPerBooks),
    depositsInTransit,
    paymentsNotDebited,
    unreconciledDeposits: depositsInTransit,
    unreconciledWithdrawals: paymentsNotDebited,
    bankOnlyDeposits,
    bankOnlyWithdrawals,
    expectedBalanceAsPerBank,
    closingBalanceAsPerStatement: closing,
    finalDifference: roundMoney(expectedBalanceAsPerBank - closing),
    reconciledCount: 0,
    pendingCount: 0,
    balanceSign: "asset",
  };
}
