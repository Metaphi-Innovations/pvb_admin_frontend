import { formatBalanceAmount, roundMoney } from "@/lib/accounts/money-format";
import {
  resolveLedgerType,
  type LedgerTypeLabel,
} from "@/lib/accounts/ledger-detail-utils";
import type { ChartOfAccount } from "../../data";
import {
  getLedgerMovementTotals,
  getPostedVouchers,
} from "../../vouchers/voucher-data";
import {
  fromSignedBalance,
  toSignedBalance,
} from "@/lib/accounts/running-balance";
import {
  getAncestorPath,
  getValidLedgerParents,
  PRIMARY_HEAD_OPTIONS,
} from "../chart-of-accounts/chart-of-accounts-data";

export interface LedgerBalance {
  amount: number;
  balanceType: "Debit" | "Credit";
}

export function getLedgerPrimaryHead(
  records: ChartOfAccount[],
  ledger: ChartOfAccount,
): ChartOfAccount | null {
  const path = getAncestorPath(records, ledger.id);
  return path.find((n) => n.nodeLevel === "primary_head") ?? null;
}

export function primaryHeadLabelForLedger(
  records: ChartOfAccount[],
  ledger: ChartOfAccount,
): string {
  const head = getLedgerPrimaryHead(records, ledger);
  if (head) return head.accountName;
  return PRIMARY_HEAD_OPTIONS.find((o) => o.value === ledger.accountType)?.label ?? ledger.accountType;
}

export function accountTypeMatchesPrimaryHead(
  ledger: ChartOfAccount,
  primaryHeadFilter: string,
): boolean {
  if (primaryHeadFilter === "all") return true;
  const opt = PRIMARY_HEAD_OPTIONS.find((o) => o.value === primaryHeadFilter);
  if (!opt) return true;
  return ledger.accountType === opt.value;
}

export function ledgerUnderGroup(
  records: ChartOfAccount[],
  ledger: ChartOfAccount,
  groupId: string,
): boolean {
  if (groupId === "all") return true;
  const gid = Number(groupId);
  if (!gid) return true;
  const path = getAncestorPath(records, ledger.id);
  return path.some((n) => n.id === gid);
}

export function getGroupFilterOptions(records: ChartOfAccount[], primaryHeadFilter: string) {
  const parents = getValidLedgerParents(records);
  return parents
    .filter((p) => {
      if (primaryHeadFilter === "all") return true;
      const path = getAncestorPath(records, p.id);
      const head = path.find((n) => n.nodeLevel === "primary_head");
      const opt = PRIMARY_HEAD_OPTIONS.find((o) => o.value === primaryHeadFilter);
      return head && opt ? head.accountName === opt.label : p.accountType === primaryHeadFilter;
    })
    .map((p) => ({
      id: p.id,
      label: getAncestorPath(records, p.id)
        .map((n) => n.accountName)
        .join(" › "),
    }));
}

export function getLedgerVoucherMovement(ledgerId: number): { debit: number; credit: number } {
  return getLedgerMovementTotals(ledgerId);
}

export interface LedgerBalanceBreakdown {
  openingBalance: number;
  openingBalanceType: "Debit" | "Credit";
  totalDebit: number;
  totalCredit: number;
  currentBalance: LedgerBalance;
}

export function computeLedgerBalanceBreakdown(ledger: ChartOfAccount): LedgerBalanceBreakdown {
  const { debit, credit } = getLedgerVoucherMovement(ledger.id);
  return {
    openingBalance: ledger.openingBalance,
    openingBalanceType: ledger.balanceType,
    totalDebit: debit,
    totalCredit: credit,
    currentBalance: computeLedgerCurrentBalance(ledger),
  };
}

/**
 * Opening side for signed math.
 * Trust stored balanceType, but recover common seed mistakes where Liability /
 * Income / Equity openings were stored as Debit (or Asset / Expense as Credit).
 */
function resolveOpeningSide(ledger: ChartOfAccount): "Debit" | "Credit" {
  const type = ledger.accountType;
  const stored = ledger.balanceType;
  const creditNormal =
    type === "Liability" || type === "Income" || type === "Equity";
  const debitNormal = type === "Asset" || type === "Expense";
  if (creditNormal && stored === "Debit" && ledger.openingBalance > 0.005) {
    return "Credit";
  }
  if (debitNormal && stored === "Credit" && ledger.openingBalance > 0.005) {
    return "Debit";
  }
  return stored;
}

/**
 * Running ledger balance from opening + posted voucher lines.
 * When `asOfDate` (YYYY-MM-DD) is set, only movements on or before that date apply.
 * Side is never hardcoded — Debit if signed ≥ 0, Credit if signed < 0.
 * Zero balance is returned as amount 0 (UI must omit Dr/Cr).
 */
export function computeLedgerBalanceAsOfDate(
  ledger: ChartOfAccount,
  asOfDate?: string | null,
): LedgerBalance {
  const openingSide = resolveOpeningSide(ledger);
  let signed = toSignedBalance(roundMoney(ledger.openingBalance), openingSide);

  if (!asOfDate) {
    const { debit, credit } = getLedgerVoucherMovement(ledger.id);
    signed = signed + roundMoney(debit) - roundMoney(credit);
  } else {
    for (const voucher of getPostedVouchers()) {
      if (voucher.date > asOfDate) continue;
      for (const line of voucher.lines) {
        if (line.ledgerId !== ledger.id) continue;
        signed =
          signed + (Number(line.debit) || 0) - (Number(line.credit) || 0);
      }
    }
  }

  const bal = fromSignedBalance(roundMoney(signed));
  if (bal.amount < 0.005) {
    return { amount: 0, balanceType: bal.balanceType };
  }
  return bal;
}

/** Current ledger balance through all posted vouchers (no date cutoff). */
export function computeLedgerCurrentBalance(ledger: ChartOfAccount): LedgerBalance {
  return computeLedgerBalanceAsOfDate(ledger, null);
}

export function formatLedgerBalance(balance: LedgerBalance): string {
  return formatBalanceAmount(balance.amount, balance.balanceType);
}

export function formatOpeningBalance(ledger: ChartOfAccount): string {
  return formatBalanceAmount(ledger.openingBalance, ledger.balanceType);
}

const LEDGER_TYPE_DISPLAY: Record<LedgerTypeLabel, string> = {
  Customer: "Customer",
  Vendor: "Vendor",
  Bank: "Bank",
  Cash: "Cash",
  Expense: "Expense",
  Income: "Income",
  GST: "GST",
  "Employee Payable": "Employee",
  Loan: "Liability",
  "Fixed Asset": "Fixed Asset",
  Inventory: "Others",
  Sales: "Others",
  Purchase: "Others",
  General: "Others",
};

/** User-facing ledger classification for listing screens */
export function ledgerTypeDisplayLabel(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): string {
  const path = getAncestorPath(records, ledger.id);
  const pathNames = path.map((p) => p.accountName.toLowerCase()).join(" ");
  if (pathNames.includes("tds")) return "TDS";
  return LEDGER_TYPE_DISPLAY[resolveLedgerType(ledger, records)] ?? "Others";
}
