import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  calcLineTotals,
  isVoucherBalanced,
  lineCreditAmount,
  lineDebitAmount,
  normalizeVoucherLineAmounts,
  type VoucherLine,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { findLedgerById, isPostableNode } from "@/lib/accounts/coa-hierarchy";
import { roundMoney } from "@/lib/accounts/money-format";
import { ledgerMatchesVoucherScope } from "@/lib/accounts/voucher-quick-add-ledger";

export type BalancingLedgerPrompt = {
  title: string;
  description: string;
  fieldLabel: string;
  ledgerFilter: (ledger: ChartOfAccount) => boolean;
};

export type VoucherPostPlan =
  | { kind: "ready"; lines: VoucherLine[] }
  | { kind: "need_balancing_ledger"; lines: VoucherLine[]; prompt: BalancingLedgerPrompt }
  | { kind: "invalid"; message: string };

let balancingLineSeq = 0;

function nextBalancingLineId(): number {
  return Date.now() + ++balancingLineSeq;
}

export function getFilledVoucherLines(lines: VoucherLine[]): VoucherLine[] {
  return lines
    .map((line) => normalizeVoucherLineAmounts(line))
    .filter(
      (line) => line.ledgerId && (lineDebitAmount(line) > 0 || lineCreditAmount(line) > 0),
    );
}

function lineAmount(line: VoucherLine): number {
  return Math.max(lineDebitAmount(line), lineCreditAmount(line));
}

function isBankCashLedger(ledgerId: number, records: ChartOfAccount[]): boolean {
  const ledger = findLedgerById(ledgerId, records);
  return Boolean(ledger && ledgerMatchesVoucherScope(ledger, "bank_cash", records));
}

function createLine(
  ledger: ChartOfAccount,
  debit: number,
  credit: number,
  remarks = "",
): VoucherLine {
  return normalizeVoucherLineAmounts({
    id: nextBalancingLineId(),
    ledgerId: ledger.id,
    ledgerName: ledger.accountName,
    debit,
    credit,
    remarks,
  });
}

function completeReceiptLines(
  primary: VoucherLine,
  balancingLedger: ChartOfAccount,
  records: ChartOfAccount[],
): VoucherLine[] {
  const amt = lineAmount(primary);
  const primaryLedger = findLedgerById(primary.ledgerId!, records)!;
  if (isBankCashLedger(primary.ledgerId!, records)) {
    return [
      createLine(primaryLedger, amt, 0, primary.remarks),
      createLine(balancingLedger, 0, amt),
    ];
  }
  return [
    createLine(balancingLedger, amt, 0),
    createLine(primaryLedger, 0, amt, primary.remarks),
  ];
}

function completePaymentLines(
  primary: VoucherLine,
  balancingLedger: ChartOfAccount,
  records: ChartOfAccount[],
): VoucherLine[] {
  const amt = lineAmount(primary);
  const primaryLedger = findLedgerById(primary.ledgerId!, records)!;
  if (isBankCashLedger(primary.ledgerId!, records)) {
    return [
      createLine(balancingLedger, amt, 0),
      createLine(primaryLedger, 0, amt, primary.remarks),
    ];
  }
  return [
    createLine(primaryLedger, amt, 0, primary.remarks),
    createLine(balancingLedger, 0, amt),
  ];
}

function receiptPaymentPrompt(
  voucherType: "receipt" | "payment",
  primary: VoucherLine,
  records: ChartOfAccount[],
): BalancingLedgerPrompt {
  const ledgerId = primary.ledgerId!;
  if (voucherType === "receipt") {
    if (isBankCashLedger(ledgerId, records)) {
      return {
        title: "Select party / income ledger",
        description: "Money received will be credited to this ledger. Bank/cash is debited automatically.",
        fieldLabel: "Received From / Party or Income Ledger",
        ledgerFilter: (ledger) => ledgerMatchesVoucherScope(ledger, "receipt_credit", records),
      };
    }
    return {
      title: "Select deposit bank or cash",
      description: "Deposit destination is debited automatically. Party/income ledger is credited.",
      fieldLabel: "Deposit To / Bank or Cash Ledger",
      ledgerFilter: (ledger) => ledgerMatchesVoucherScope(ledger, "bank_cash", records),
    };
  }

  if (isBankCashLedger(ledgerId, records)) {
    return {
      title: "Select paid-to ledger",
      description: "Vendor or expense is debited automatically. Bank/cash is credited.",
      fieldLabel: "Paid To / Party or Expense Ledger",
      ledgerFilter: (ledger) => ledgerMatchesVoucherScope(ledger, "payment_debit", records),
    };
  }
  return {
    title: "Select paid-from bank or cash",
    description: "Party/expense is debited automatically. Bank/cash is credited.",
    fieldLabel: "Paid From / Bank or Cash Ledger",
    ledgerFilter: (ledger) => ledgerMatchesVoucherScope(ledger, "bank_cash", records),
  };
}

function contraPrompt(primary: VoucherLine, records: ChartOfAccount[]): BalancingLedgerPrompt {
  const isDebit = lineDebitAmount(primary) > 0;
  return {
    title: isDebit ? "Select source bank or cash" : "Select destination bank or cash",
    description: isDebit
      ? "Funds transfer: debit destination (entered) · credit source (selected)."
      : "Funds transfer: debit destination (selected) · credit source (entered).",
    fieldLabel: isDebit ? "Transfer From / Source Ledger" : "Transfer To / Destination Ledger",
    ledgerFilter: (ledger) =>
      ledgerMatchesVoucherScope(ledger, "bank_cash", records) && ledger.id !== primary.ledgerId,
  };
}

function journalPrompt(records: ChartOfAccount[]): BalancingLedgerPrompt {
  return {
    title: "Select balancing ledger",
    description:
      "An opposite entry will be created on this ledger so the voucher balances before posting.",
    fieldLabel: "Balancing Ledger",
    ledgerFilter: (ledger) => isPostableNode(ledger, records),
  };
}

function completeContraLines(primary: VoucherLine, balancingLedger: ChartOfAccount): VoucherLine[] {
  const amt = lineAmount(primary);
  const primaryLedger = findLedgerById(primary.ledgerId!)!;
  if (lineDebitAmount(primary) > 0) {
    return [
      createLine(primaryLedger, amt, 0, primary.remarks),
      createLine(balancingLedger, 0, amt),
    ];
  }
  return [
    createLine(balancingLedger, amt, 0),
    createLine(primaryLedger, 0, amt, primary.remarks),
  ];
}

function completeJournalLines(filled: VoucherLine[], balancingLedger: ChartOfAccount): VoucherLine[] {
  const { totalDebit, totalCredit } = calcLineTotals(filled);
  const diff = roundMoney(totalDebit - totalCredit);
  if (diff > 0) {
    return [...filled, createLine(balancingLedger, 0, diff)];
  }
  if (diff < 0) {
    return [...filled, createLine(balancingLedger, Math.abs(diff), 0)];
  }
  if (!filled.some((l) => lineDebitAmount(l) > 0)) {
    const amt = lineAmount(filled[0]);
    return [...filled, createLine(balancingLedger, amt, 0)];
  }
  if (!filled.some((l) => lineCreditAmount(l) > 0)) {
    const amt = lineAmount(filled[0]);
    return [...filled, createLine(balancingLedger, 0, amt)];
  }
  return filled;
}

export function planVoucherPost(
  voucherType: VoucherTypeCode,
  rawLines: VoucherLine[],
  records = loadChartOfAccounts(),
): VoucherPostPlan {
  const filled = getFilledVoucherLines(rawLines);
  if (filled.length === 0) {
    return { kind: "invalid", message: "Add at least one ledger line with an amount." };
  }
  for (const line of filled) {
    if (!line.ledgerId) {
      return { kind: "invalid", message: "Select a ledger for every row with an amount." };
    }
  }

  const { totalDebit, totalCredit } = calcLineTotals(filled);
  const balanced = isVoucherBalanced(totalDebit, totalCredit);
  const hasDebit = filled.some((l) => lineDebitAmount(l) > 0);
  const hasCredit = filled.some((l) => lineCreditAmount(l) > 0);

  if (balanced && hasDebit && hasCredit && filled.length >= 2) {
    return { kind: "ready", lines: filled };
  }

  if (voucherType === "receipt" || voucherType === "payment") {
    if (filled.length === 1) {
      return {
        kind: "need_balancing_ledger",
        lines: filled,
        prompt: receiptPaymentPrompt(voucherType, filled[0], records),
      };
    }
    if (!balanced) {
      return {
        kind: "invalid",
        message: "Debit and credit totals must match, or enter a single line to auto-balance on post.",
      };
    }
    return { kind: "invalid", message: "Add both debit and credit entries, or use a single line to auto-balance." };
  }

  if (voucherType === "contra") {
    if (filled.length === 1) {
      const primary = filled[0];
      if (!isBankCashLedger(primary.ledgerId!, records)) {
        return { kind: "invalid", message: "Contra entry must use a bank or cash ledger." };
      }
      return {
        kind: "need_balancing_ledger",
        lines: filled,
        prompt: contraPrompt(primary, records),
      };
    }
    if (balanced && hasDebit && hasCredit) {
      return { kind: "ready", lines: filled };
    }
    return {
      kind: "invalid",
      message: "Enter one bank/cash line to auto-balance, or complete matching debit and credit rows.",
    };
  }

  if (voucherType === "journal") {
    return {
      kind: "need_balancing_ledger",
      lines: filled,
      prompt: journalPrompt(records),
    };
  }

  if (balanced && hasDebit && hasCredit) {
    return { kind: "ready", lines: filled };
  }

  return { kind: "invalid", message: "Voucher is not balanced." };
}

export function completeVoucherWithBalancingLedger(
  voucherType: VoucherTypeCode,
  lines: VoucherLine[],
  balancingLedger: ChartOfAccount,
  records = loadChartOfAccounts(),
): VoucherLine[] {
  const filled = getFilledVoucherLines(lines);

  if (voucherType === "receipt") {
    return completeReceiptLines(filled[0], balancingLedger, records);
  }
  if (voucherType === "payment") {
    return completePaymentLines(filled[0], balancingLedger, records);
  }
  if (voucherType === "contra") {
    return completeContraLines(filled[0], balancingLedger);
  }
  return completeJournalLines(filled, balancingLedger);
}
