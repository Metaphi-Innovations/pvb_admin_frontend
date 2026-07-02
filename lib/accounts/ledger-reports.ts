/**
 * Report computations derived from Voucher Entries posted to Ledgers only.
 * Uses COA hierarchy for classification; never aggregates structural nodes as posting targets.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getCoaLedgers, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  computeLedgerCurrentBalance,
  type LedgerBalance,
} from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";

export interface LedgerMovement {
  debit: number;
  credit: number;
}

export interface TrialBalanceRow {
  ledgerId: number;
  ledger: string;
  primaryHead: string;
  accountGroup: string;
  subGroup: string;
  opening: number;
  openingBalanceType: ChartOfAccount["balanceType"];
  debit: number;
  credit: number;
  closing: LedgerBalance;
}

export interface LedgerReportRow {
  ledgerId: number;
  ledger: string;
  group: string;
  primaryHead: string;
  opening: LedgerBalance;
  movement: LedgerMovement;
  closing: LedgerBalance;
}

export interface PandLRow {
  ledgerId: number;
  head: string;
  type: "Income" | "Expense";
  primaryHead: string;
  accountGroup: string;
  amount: LedgerBalance;
}

function postedVouchers() {
  return loadVouchers().filter(
    (v) => v.status === "posted" || v.status === "approved",
  );
}

export function getVoucherMovementForLedger(ledgerId: number): LedgerMovement {
  let debit = 0;
  let credit = 0;
  postedVouchers().forEach((v) => {
    v.lines.forEach((line) => {
      if (line.ledgerId === ledgerId) {
        debit += Number(line.debit) || 0;
        credit += Number(line.credit) || 0;
      }
    });
  });
  return { debit, credit };
}

export function computeTrialBalanceRows(
  records: ChartOfAccount[] = loadChartOfAccounts(),
): TrialBalanceRow[] {
  return getCoaLedgers()
    .map((ledger) => {
      const movement = getVoucherMovementForLedger(ledger.id);
      const hierarchy = resolveHierarchyPath(records, ledger.id);
      return {
        ledgerId: ledger.id,
        ledger: ledger.accountName,
        primaryHead: hierarchy.primaryHead?.accountName ?? "—",
        accountGroup: hierarchy.accountGroup?.accountName ?? "—",
        subGroup: hierarchy.standardGroup?.accountName ?? "—",
        opening: ledger.openingBalance,
        openingBalanceType: ledger.balanceType,
        debit: movement.debit,
        credit: movement.credit,
        closing: computeLedgerCurrentBalance(ledger),
      };
    })
    .sort((a, b) => a.ledger.localeCompare(b.ledger));
}

export function computeLedgerReportRows(
  records: ChartOfAccount[] = loadChartOfAccounts(),
): LedgerReportRow[] {
  return getCoaLedgers()
    .map((ledger) => {
      const hierarchy = resolveHierarchyPath(records, ledger.id);
      const groupPath = hierarchy.path
        .filter((n) => n.nodeLevel === "account_group")
        .map((n) => n.accountName)
        .join(" › ");
      return {
        ledgerId: ledger.id,
        ledger: ledger.accountName,
        group: groupPath || "—",
        primaryHead: hierarchy.primaryHead?.accountName ?? "—",
        opening: {
          amount: ledger.openingBalance,
          balanceType: ledger.balanceType,
        },
        movement: getVoucherMovementForLedger(ledger.id),
        closing: computeLedgerCurrentBalance(ledger),
      };
    })
    .sort((a, b) => a.ledger.localeCompare(b.ledger));
}

function signedAmount(balance: LedgerBalance): number {
  return balance.balanceType === "Debit" ? balance.amount : -balance.amount;
}

export function computePandLRows(
  records: ChartOfAccount[] = loadChartOfAccounts(),
): { rows: PandLRow[]; net: number } {
  const rows: PandLRow[] = [];
  for (const ledger of getCoaLedgers()) {
    const hierarchy = resolveHierarchyPath(records, ledger.id);
    const headName = hierarchy.primaryHead?.accountName;
    if (headName !== "Income" && headName !== "Expenses") continue;
    const closing = computeLedgerCurrentBalance(ledger);
    rows.push({
      ledgerId: ledger.id,
      head: ledger.accountName,
      type: headName === "Income" ? "Income" : "Expense",
      primaryHead: headName,
      accountGroup: hierarchy.accountGroup?.accountName ?? "—",
      amount: closing,
    });
  }
  rows.sort((a, b) => a.head.localeCompare(b.head));
  const income = rows
    .filter((r) => r.type === "Income")
    .reduce((s, r) => s + signedAmount(r.amount), 0);
  const expense = rows
    .filter((r) => r.type === "Expense")
    .reduce((s, r) => s + signedAmount(r.amount), 0);
  return { rows, net: income - expense };
}

export interface BalanceSheetRow {
  ledgerId: number;
  head: string;
  section: "Asset" | "Liability";
  primaryHead: string;
  accountGroup: string;
  balance: LedgerBalance;
}

export function computeBalanceSheetRows(
  records: ChartOfAccount[] = loadChartOfAccounts(),
): BalanceSheetRow[] {
  return getCoaLedgers()
    .filter((l) => l.accountType === "Asset" || l.accountType === "Liability")
    .map((ledger): BalanceSheetRow => {
      const hierarchy = resolveHierarchyPath(records, ledger.id);
      const section: BalanceSheetRow["section"] =
        ledger.accountType === "Asset" ? "Asset" : "Liability";
      return {
        ledgerId: ledger.id,
        head: ledger.accountName,
        section,
        primaryHead: hierarchy.primaryHead?.accountName ?? "—",
        accountGroup: hierarchy.accountGroup?.accountName ?? "—",
        balance: computeLedgerCurrentBalance(ledger),
      };
    })
    .sort((a, b) => a.head.localeCompare(b.head));
}
