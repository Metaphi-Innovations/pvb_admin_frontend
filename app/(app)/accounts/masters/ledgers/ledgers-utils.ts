import { formatBalanceAmount } from "@/lib/accounts/money-format";
import type { ChartOfAccount } from "../../data";
import { loadVouchers } from "../../vouchers/voucher-data";
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

function voucherMovement(ledgerId: number): { debit: number; credit: number } {
  let debit = 0;
  let credit = 0;
  loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (line.ledgerId === ledgerId) {
          debit += Number(line.debit) || 0;
          credit += Number(line.credit) || 0;
        }
      });
    });
  return { debit, credit };
}

function signedBalance(amount: number, balanceType: "Debit" | "Credit"): number {
  return balanceType === "Debit" ? amount : -amount;
}

export function computeLedgerCurrentBalance(ledger: ChartOfAccount): LedgerBalance {
  const { debit, credit } = voucherMovement(ledger.id);
  const signed =
    signedBalance(ledger.openingBalance, ledger.balanceType) + debit - credit;
  if (signed >= 0) {
    return { amount: signed, balanceType: "Debit" };
  }
  return { amount: Math.abs(signed), balanceType: "Credit" };
}

export function formatLedgerBalance(balance: LedgerBalance): string {
  return formatBalanceAmount(balance.amount, balance.balanceType);
}

export function formatOpeningBalance(ledger: ChartOfAccount): string {
  return formatBalanceAmount(ledger.openingBalance, ledger.balanceType);
}
