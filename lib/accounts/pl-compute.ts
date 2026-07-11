/**
 * Profit & Loss computation from posted voucher lines with dimensional filters.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getCoaLedgers, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import {
  isPostingLedger,
  resolveHierarchyPath,
} from "@/lib/accounts/coa-hierarchy";
import { roundMoney } from "@/lib/accounts/money-format";
import { isLedgerMovementVoucherStatus } from "@/lib/accounts/running-balance";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  getTrialBalanceBranchOptions,
  getTrialBalanceWarehouseOptions,
} from "@/lib/accounts/trial-balance-compute";
import {
  resolveVoucherTransactionTags,
  voucherMatchesDimensionFilters,
} from "@/lib/accounts/trial-balance-voucher-tags";
import {
  isMultiFilterActive,
  matchesLedgerGroupIdFilter,
  matchesLedgerIdFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";

export type PandLViewType = "summary" | "detailed";

export interface PandLFilters {
  financialYearId: string;
  dateFrom: string;
  dateTo: string;
  branch: string | string[];
  warehouse: string | string[];
  partyId: string | string[];
  ledgerGroupId: string | string[];
  ledgerId: string | string[];
  viewType: PandLViewType;
  search?: string;
}

export interface ComputedPandLLedgerAmount {
  ledgerId: number;
  ledgerName: string;
  amount: number;
  signedAmount: number;
  isReturn: boolean;
  section: "income" | "expense";
  sortOrder: number;
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

function voucherPassesFilters(
  voucher: AccountingVoucher,
  filters: PandLFilters,
): boolean {
  if (!voucherMatchesFinancialYear(voucher, filters.financialYearId)) return false;
  if (voucher.date < filters.dateFrom || voucher.date > filters.dateTo) return false;
  return voucherMatchesDimensionFilters(voucher, {
    branch: filters.branch,
    warehouse: filters.warehouse,
    partyId: filters.partyId,
  });
}

function collectFilteredVouchers(filters: PandLFilters): AccountingVoucher[] {
  return loadVouchers().filter((v) => {
    if (!isLedgerMovementVoucherStatus(v.status)) return false;
    return voucherPassesFilters(v, filters);
  });
}

function aggregateVoucherLines(
  vouchers: AccountingVoucher[],
): Map<number, { debit: number; credit: number }> {
  const map = new Map<number, { debit: number; credit: number }>();
  for (const voucher of vouchers) {
    for (const line of voucher.lines) {
      if (!line.ledgerId) continue;
      const cur = map.get(line.ledgerId) ?? { debit: 0, credit: 0 };
      cur.debit += Number(line.debit) || 0;
      cur.credit += Number(line.credit) || 0;
      map.set(line.ledgerId, cur);
    }
  }
  return map;
}

function isReturnLedgerName(name: string): boolean {
  return /\breturn\b/i.test(name);
}

function plAmountForLedger(
  ledger: ChartOfAccount,
  debit: number,
  credit: number,
): { amount: number; signedAmount: number; isReturn: boolean } {
  const isReturn = isReturnLedgerName(ledger.accountName);
  if (ledger.accountType === "Income") {
    const net = roundMoney(credit - debit);
    if (isReturn) {
      const abs = roundMoney(Math.abs(net));
      return { amount: abs, signedAmount: -abs, isReturn: true };
    }
    return { amount: net, signedAmount: net, isReturn: false };
  }
  const net = roundMoney(debit - credit);
  if (isReturn) {
    const abs = roundMoney(Math.abs(net));
    return { amount: abs, signedAmount: -abs, isReturn: true };
  }
  return { amount: net, signedAmount: net, isReturn: false };
}

function ledgerPassesStructuralFilters(
  ledgerId: number,
  filters: PandLFilters,
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

function displayPathUnderPrimaryHead(
  records: ChartOfAccount[],
  ledgerId: number,
): ChartOfAccount[] {
  const path = getAncestorPath(records, ledgerId);
  const phIdx = path.findIndex((n) => n.nodeLevel === "primary_head");
  if (phIdx < 0) return [];
  return path.slice(phIdx + 1);
}

export function computePandLLedgerAmounts(
  filters: PandLFilters,
): ComputedPandLLedgerAmount[] {
  const records = loadChartOfAccounts();
  const periodVouchers = collectFilteredVouchers(filters);
  const periodMap = aggregateVoucherLines(periodVouchers);
  const rows: ComputedPandLLedgerAmount[] = [];

  for (const ledger of getCoaLedgers()) {
    if (ledger.accountType !== "Income" && ledger.accountType !== "Expense") continue;
    if (!isPostingLedger(ledger, records)) continue;
    if (!ledgerPassesStructuralFilters(ledger.id, filters, records)) continue;

    const movement = periodMap.get(ledger.id) ?? { debit: 0, credit: 0 };
    const { amount, signedAmount, isReturn } = plAmountForLedger(
      ledger,
      movement.debit,
      movement.credit,
    );
    if (amount === 0 && signedAmount === 0) continue;

    const path = displayPathUnderPrimaryHead(records, ledger.id);
    const section: "income" | "expense" =
      ledger.accountType === "Income" ? "income" : "expense";

    rows.push({
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      amount,
      signedAmount,
      isReturn,
      section,
      sortOrder: path.length > 0 ? path[path.length - 1].id : ledger.id,
    });
  }

  const q = (filters.search ?? "").trim().toLowerCase();
  if (q) {
    return rows.filter((r) => r.ledgerName.toLowerCase().includes(q));
  }

  return rows.sort(
    (a, b) =>
      a.section.localeCompare(b.section) ||
      a.sortOrder - b.sortOrder ||
      a.ledgerName.localeCompare(b.ledgerName),
  );
}

/** Net profit for a period — used by Balance Sheet P&L integration. */
export function computePandLNetProfit(
  filters: Pick<
    PandLFilters,
    "financialYearId" | "dateFrom" | "dateTo" | "branch" | "warehouse" | "partyId"
  >,
): number {
  const amounts = computePandLLedgerAmounts({
    ...filters,
    ledgerGroupId: "all",
    ledgerId: "all",
    viewType: "summary",
  });
  let income = 0;
  let expense = 0;
  for (const row of amounts) {
    if (row.section === "income") income = roundMoney(income + row.signedAmount);
    else expense = roundMoney(expense + row.signedAmount);
  }
  return roundMoney(income - expense);
}

export function getPandLLedgerGroupOptions(): { id: number; name: string }[] {
  const records = loadChartOfAccounts();
  const incomeHead = records.find(
    (r) => r.nodeLevel === "primary_head" && r.accountName === "Income",
  );
  const expenseHead = records.find(
    (r) => r.nodeLevel === "primary_head" && r.accountName === "Expenses",
  );
  const headIds = new Set([incomeHead?.id, expenseHead?.id].filter(Boolean));

  const isUnderPlHead = (groupId: number): boolean => {
    const path = getAncestorPath(records, groupId);
    return path.some((n) => headIds.has(n.id));
  };

  return records
    .filter((r) => r.nodeLevel === "account_group" && isUnderPlHead(r.id))
    .map((r) => ({ id: r.id, name: r.accountName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getPandLLedgerOptions(
  ledgerGroupId: string,
): { id: number; name: string }[] {
  const records = loadChartOfAccounts();
  const ledgers = getCoaLedgers().filter(
    (l) => l.accountType === "Income" || l.accountType === "Expense",
  );
  const groupId = ledgerGroupId !== "all" && ledgerGroupId ? Number(ledgerGroupId) : null;

  return ledgers
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

export interface PandLPartyOption {
  id: string;
  name: string;
  kind: "customer" | "vendor";
}

export function getPandLPartyOptions(): PandLPartyOption[] {
  const customers = loadCustomers()
    .filter((c) => c.status === "active")
    .map((c) => ({
      id: `customer:${c.id}`,
      name: c.customerName,
      kind: "customer" as const,
    }));
  const vendors = getActiveVendors().map((v) => ({
    id: `vendor:${v.id}`,
    name: v.vendorName,
    kind: "vendor" as const,
  }));
  return [...customers, ...vendors].sort((a, b) => a.name.localeCompare(b.name));
}

export function getPandLBranchOptions(): string[] {
  return getTrialBalanceBranchOptions();
}

export function getPandLWarehouseOptions(): string[] {
  return getTrialBalanceWarehouseOptions();
}

export function resolvePartyFilterLabel(partyId: string): string {
  if (partyId === "all" || !partyId) return "All parties";
  const opt = getPandLPartyOptions().find((p) => p.id === partyId);
  return opt?.name ?? partyId;
}

export function resolveFinancialYearLabel(financialYearId: string): string {
  if (financialYearId === "all" || !financialYearId) return "All years";
  const fy = loadFinancialYears().find((f) => String(f.id) === financialYearId);
  return fy?.name ?? financialYearId;
}

/** Dynamic party options from vouchers with tagged source documents. */
export function getPandLActivePartyOptions(): PandLPartyOption[] {
  const all = getPandLPartyOptions();
  const activeIds = new Set<string>();

  for (const voucher of loadVouchers()) {
    if (!isLedgerMovementVoucherStatus(voucher.status)) continue;
    const tags = resolveVoucherTransactionTags(voucher);
    if (tags.customerId) activeIds.add(`customer:${tags.customerId}`);
    if (tags.vendorId) activeIds.add(`vendor:${tags.vendorId}`);
  }

  return all.filter((p) => activeIds.has(p.id));
}
