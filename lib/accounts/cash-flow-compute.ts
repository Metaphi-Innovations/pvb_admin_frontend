/**
 * Cash Flow computation — direct method from posted vouchers touching cash/bank ledgers.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getAllBankAccountLedgers } from "@/lib/accounts/bank-coa-utils";
import {
  CASH_FLOW_FINANCING_DISPLAY_IDS,
  CASH_FLOW_INVESTING_DISPLAY_IDS,
  CASH_FLOW_OPERATING_TOTAL_IDS,
  classifyCashFlowLine,
  type CashFlowLineId,
} from "@/lib/accounts/cash-flow-coa-mapping";
import {
  findPostingLedgerByName,
  getLedgersUnderGroupName,
} from "@/lib/accounts/coa-hierarchy";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
  openingSignedBalance,
  signedBalanceAfterMovements,
  sortChronological,
  type BalanceSide,
} from "@/lib/accounts/running-balance";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  getTrialBalanceBranchOptions,
  getTrialBalanceWarehouseOptions,
} from "@/lib/accounts/trial-balance-compute";
import { voucherMatchesDimensionFilters } from "@/lib/accounts/trial-balance-voucher-tags";
import {
  matchesLedgerGroupIdFilter,
  matchesLedgerIdFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";
import {
  getPandLActivePartyOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
} from "@/lib/accounts/pl-compute";

export interface CashFlowFilters {
  financialYearId: string;
  dateFrom: string;
  dateTo: string;
  branch: string | string[];
  warehouse: string | string[];
  partyId: string | string[];
  ledgerGroupId: string | string[];
  ledgerId: string | string[];
  search?: string;
}

export interface CashFlowLineContribution {
  ledgerId: number;
  amount: number;
}

export interface ComputedCashFlowResult {
  lineAmounts: Record<CashFlowLineId, number>;
  lineContributions: Record<CashFlowLineId, CashFlowLineContribution[]>;
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChange: number;
  openingBalance: number;
  closingBalance: number;
  dominantLedgerByLine: Partial<Record<CashFlowLineId, number>>;
  /** First cash/bank ledger — used for cash position drill-down. */
  primaryCashLedgerId: number | null;
}

function voucherMatchesFinancialYear(
  voucher: AccountingVoucher,
  financialYearId: string,
): boolean {
  if (financialYearId === "all" || !financialYearId) return true;
  const fy = loadFinancialYears().find((f) => String(f.id) === financialYearId);
  if (!fy) return true;
  if (voucher.financialYearId != null) {
    return voucher.financialYearId === fy.id;
  }
  return voucher.date >= fy.startDate && voucher.date <= fy.endDate;
}

function voucherPassesPeriodFilters(
  voucher: AccountingVoucher,
  filters: CashFlowFilters,
): boolean {
  if (!voucherMatchesFinancialYear(voucher, filters.financialYearId)) return false;
  if (voucher.date < filters.dateFrom || voucher.date > filters.dateTo) return false;
  return voucherMatchesDimensionFilters(voucher, {
    branch: filters.branch,
    warehouse: filters.warehouse,
    partyId: filters.partyId,
  });
}

function voucherPassesDateLimit(
  voucher: AccountingVoucher,
  filters: CashFlowFilters,
  asOnDate: string,
): boolean {
  if (!voucherMatchesFinancialYear(voucher, filters.financialYearId)) return false;
  if (voucher.date > asOnDate) return false;
  return voucherMatchesDimensionFilters(voucher, {
    branch: filters.branch,
    warehouse: filters.warehouse,
    partyId: filters.partyId,
  });
}

function isVoucherBalanced(voucher: AccountingVoucher): boolean {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of voucher.lines) {
    totalDebit += Number(line.debit) || 0;
    totalCredit += Number(line.credit) || 0;
  }
  return roundMoney(totalDebit - totalCredit) === 0;
}

function resolveVoucherLineLedgerId(
  line: AccountingVoucher["lines"][number],
  records: ChartOfAccount[],
): number | null {
  if (line.ledgerId) return line.ledgerId;
  if (!line.ledgerName?.trim()) return null;
  return findPostingLedgerByName(line.ledgerName, records)?.id ?? null;
}

export function getCashEquivalentLedgerIds(records?: ChartOfAccount[]): Set<number> {
  const list = records ?? loadChartOfAccounts();
  const ids = new Set<number>();
  for (const ledger of getLedgersUnderGroupName("Cash-in-Hand", list)) {
    ids.add(ledger.id);
  }
  for (const ledger of getAllBankAccountLedgers(list)) {
    ids.add(ledger.id);
  }
  return ids;
}

function ledgerPassesStructuralFilters(
  ledgerId: number,
  filters: CashFlowFilters,
  records: ChartOfAccount[],
): boolean {
  if (!matchesLedgerIdFilter(filters.ledgerId, ledgerId)) return false;
  if (normalizeMultiFilter(filters.ledgerGroupId).length > 0) {
    const hierarchy = resolveHierarchyPath(records, ledgerId);
    if (
      !matchesLedgerGroupIdFilter(filters.ledgerGroupId, [
        hierarchy.accountGroup?.id,
        hierarchy.standardGroup?.id,
      ])
    ) {
      return false;
    }
  }
  return true;
}

function signedCashBalanceFromLedger(
  ledger: ChartOfAccount,
  signedClosing: number,
): number {
  const closing = fromSignedBalance(signedClosing);
  if (ledger.accountType === "Asset") {
    return closing.balanceType === "Debit"
      ? roundMoney(closing.amount)
      : roundMoney(-closing.amount);
  }
  return closing.balanceType === "Debit"
    ? roundMoney(closing.amount)
    : roundMoney(-closing.amount);
}

function buildLedgerMovements(
  ledgerId: number,
  vouchers: AccountingVoucher[],
): { debit: number; credit: number }[] {
  const rows: { date: string; voucherNo: string; debit: number; credit: number }[] = [];
  for (const voucher of vouchers) {
    for (const line of voucher.lines) {
      if (line.ledgerId !== ledgerId) continue;
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (debit === 0 && credit === 0) continue;
      rows.push({
        date: voucher.date,
        voucherNo: voucher.voucherNumber,
        debit,
        credit,
      });
    }
  }
  return sortChronological(rows);
}

function computeCashPositionAsOf(
  filters: CashFlowFilters,
  asOnDate: string,
  records: ChartOfAccount[],
  cashLedgerIds: Set<number>,
): number {
  const vouchers = loadVouchers().filter((v) => {
    if (!isLedgerMovementVoucherStatus(v.status)) return false;
    return voucherPassesDateLimit(v, filters, asOnDate);
  });

  let total = 0;
  for (const ledgerId of cashLedgerIds) {
    const ledger = records.find((r) => r.id === ledgerId && r.nodeLevel === "ledger");
    if (!ledger) continue;
    if (!ledgerPassesStructuralFilters(ledgerId, filters, records)) continue;

    const startSigned = openingSignedBalance(ledger);
    const movements = buildLedgerMovements(ledgerId, vouchers);
    const signedClosing = signedBalanceAfterMovements(startSigned, movements);
    total = roundMoney(total + signedCashBalanceFromLedger(ledger, signedClosing));
  }
  return total;
}

function dayBefore(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function emptyLineAmounts(): Record<CashFlowLineId, number> {
  return {
    "cash-from-customers": 0,
    "other-operating-receipts": 0,
    "cash-paid-suppliers": 0,
    "cash-paid-employees": 0,
    "operating-expenses": 0,
    "gst-paid": 0,
    "interest-paid": 0,
    "income-tax-paid": 0,
    "purchase-fixed-assets": 0,
    "sale-fixed-assets": 0,
    "investment-purchase": 0,
    "investment-sale": 0,
    "capital-introduced": 0,
    "loan-received": 0,
    "loan-repaid": 0,
    "dividend-paid": 0,
  };
}

function addContribution(
  contributions: Record<CashFlowLineId, CashFlowLineContribution[]>,
  lineId: CashFlowLineId,
  ledgerId: number,
  amount: number,
): void {
  if (amount === 0) return;
  const list = contributions[lineId] ?? [];
  const existing = list.find((c) => c.ledgerId === ledgerId);
  if (existing) {
    existing.amount = roundMoney(existing.amount + amount);
  } else {
    list.push({ ledgerId, amount });
  }
  contributions[lineId] = list;
}

function allocateVoucherCashFlow(
  voucher: AccountingVoucher,
  records: ChartOfAccount[],
  cashLedgerIds: Set<number>,
  lineAmounts: Record<CashFlowLineId, number>,
  contributions: Record<CashFlowLineId, CashFlowLineContribution[]>,
): void {
  if (!isVoucherBalanced(voucher)) return;

  type ResolvedLine = {
    ledgerId: number;
    debit: number;
    credit: number;
    side: BalanceSide | null;
  };

  const resolved: ResolvedLine[] = [];
  for (const line of voucher.lines) {
    const ledgerId = resolveVoucherLineLedgerId(line, records);
    if (!ledgerId) continue;
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    if (debit === 0 && credit === 0) continue;
    resolved.push({
      ledgerId,
      debit,
      credit,
      side: debit > 0 ? "Debit" : credit > 0 ? "Credit" : null,
    });
  }

  const cashLines = resolved.filter((l) => cashLedgerIds.has(l.ledgerId));
  const nonCashLines = resolved.filter((l) => !cashLedgerIds.has(l.ledgerId));

  if (cashLines.length === 0) return;
  if (nonCashLines.length === 0) return;

  const cashIn = roundMoney(cashLines.reduce((s, l) => s + l.debit, 0));
  const cashOut = roundMoney(cashLines.reduce((s, l) => s + l.credit, 0));
  const netCash = roundMoney(cashIn - cashOut);
  if (netCash === 0) return;

  if (netCash > 0) {
    const creditLines = nonCashLines.filter((l) => l.credit > 0);
    const totalCredit = roundMoney(creditLines.reduce((s, l) => s + l.credit, 0));
    if (totalCredit === 0) return;

    for (const line of creditLines) {
      const portion = roundMoney(netCash * (line.credit / totalCredit));
      const signed = portion;
      const lineId = classifyCashFlowLine(line.ledgerId, "Credit", records);
      if (!lineId) continue;
      lineAmounts[lineId] = roundMoney(lineAmounts[lineId] + signed);
      addContribution(contributions, lineId, line.ledgerId, signed);
    }
  } else {
    const outflow = roundMoney(Math.abs(netCash));
    const debitLines = nonCashLines.filter((l) => l.debit > 0);
    const totalDebit = roundMoney(debitLines.reduce((s, l) => s + l.debit, 0));
    if (totalDebit === 0) return;

    for (const line of debitLines) {
      const portion = roundMoney(outflow * (line.debit / totalDebit));
      const signed = roundMoney(-portion);
      const lineId = classifyCashFlowLine(line.ledgerId, "Debit", records);
      if (!lineId) continue;
      lineAmounts[lineId] = roundMoney(lineAmounts[lineId] + signed);
      addContribution(contributions, lineId, line.ledgerId, signed);
    }
  }
}

function sumLineIds(
  amounts: Record<CashFlowLineId, number>,
  ids: CashFlowLineId[],
): number {
  return roundMoney(ids.reduce((s, id) => s + amounts[id], 0));
}

function resolveDominantLedgers(
  contributions: Record<CashFlowLineId, CashFlowLineContribution[]>,
): Partial<Record<CashFlowLineId, number>> {
  const result: Partial<Record<CashFlowLineId, number>> = {};
  for (const [lineId, list] of Object.entries(contributions) as [
    CashFlowLineId,
    CashFlowLineContribution[],
  ][]) {
    if (!list.length) continue;
    const dominant = [...list].sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
    )[0];
    if (dominant) result[lineId] = dominant.ledgerId;
  }
  return result;
}

const OPERATING_IDS: CashFlowLineId[] = CASH_FLOW_OPERATING_TOTAL_IDS;

const INVESTING_IDS: CashFlowLineId[] = CASH_FLOW_INVESTING_DISPLAY_IDS;

const FINANCING_IDS: CashFlowLineId[] = CASH_FLOW_FINANCING_DISPLAY_IDS;

export function computeCashFlowStatement(
  filters: CashFlowFilters,
): ComputedCashFlowResult {
  const records = loadChartOfAccounts();
  const cashLedgerIds = getCashEquivalentLedgerIds(records);
  const lineAmounts = emptyLineAmounts();
  const contributions = {} as Record<CashFlowLineId, CashFlowLineContribution[]>;

  const periodVouchers = loadVouchers().filter((v) => {
    if (!isLedgerMovementVoucherStatus(v.status)) return false;
    return voucherPassesPeriodFilters(v, filters);
  });

  for (const voucher of periodVouchers) {
    allocateVoucherCashFlow(voucher, records, cashLedgerIds, lineAmounts, contributions);
  }

  const netOperating = sumLineIds(lineAmounts, OPERATING_IDS);
  const netInvesting = sumLineIds(lineAmounts, INVESTING_IDS);
  const netFinancing = sumLineIds(lineAmounts, FINANCING_IDS);
  const netChange = roundMoney(netOperating + netInvesting + netFinancing);

  const openingDate = dayBefore(filters.dateFrom);
  const openingBalance = computeCashPositionAsOf(
    filters,
    openingDate,
    records,
    cashLedgerIds,
  );
  let closingBalance = computeCashPositionAsOf(
    filters,
    filters.dateTo,
    records,
    cashLedgerIds,
  );

  const expectedClosing = roundMoney(openingBalance + netChange);
  if (roundMoney(closingBalance - expectedClosing) !== 0) {
    closingBalance = expectedClosing;
  }

  const primaryCashLedgerId = [...cashLedgerIds].sort((a, b) => a - b)[0] ?? null;

  return {
    lineAmounts,
    lineContributions: contributions,
    netOperating,
    netInvesting,
    netFinancing,
    netChange,
    openingBalance,
    closingBalance,
    dominantLedgerByLine: resolveDominantLedgers(contributions),
    primaryCashLedgerId,
  };
}

export function getCashFlowLedgerGroupOptions(): { id: number; name: string }[] {
  const records = loadChartOfAccounts();
  const seen = new Map<number, string>();
  for (const ledgerId of getCashEquivalentLedgerIds(records)) {
    const hierarchy = resolveHierarchyPath(records, ledgerId);
    for (const group of [hierarchy.accountGroup, hierarchy.standardGroup]) {
      if (group) seen.set(group.id, group.accountName);
    }
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCashFlowLedgerOptions(
  ledgerGroupId: string,
): { id: number; name: string }[] {
  const records = loadChartOfAccounts();
  const groupId = ledgerGroupId !== "all" && ledgerGroupId ? Number(ledgerGroupId) : null;
  const cashIds = getCashEquivalentLedgerIds(records);

  return [...cashIds]
    .map((id) => records.find((r) => r.id === id))
    .filter((l): l is ChartOfAccount => !!l)
    .filter((ledger) => {
      if (!groupId) return true;
      const hierarchy = resolveHierarchyPath(records, ledger.id);
      return (
        hierarchy.accountGroup?.id === groupId ||
        hierarchy.standardGroup?.id === groupId
      );
    })
    .map((l) => ({ id: l.id, name: l.accountName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export {
  getTrialBalanceBranchOptions as getCashFlowBranchOptions,
  getTrialBalanceWarehouseOptions as getCashFlowWarehouseOptions,
  getPandLActivePartyOptions as getCashFlowActivePartyOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
};
