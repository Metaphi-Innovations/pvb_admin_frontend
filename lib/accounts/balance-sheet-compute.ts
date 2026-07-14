/**
 * Balance Sheet computation — cumulative balances as of a date with dimensional filters.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getCoaLedgers, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import {
  isPostingLedger,
  resolveHierarchyPath,
} from "@/lib/accounts/coa-hierarchy";
import { resolveLedgerType } from "@/lib/accounts/ledger-detail-utils";
import { roundMoney } from "@/lib/accounts/money-format";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  computePandLNetProfit,
  getPandLActivePartyOptions,
  getPandLBranchOptions,
  getPandLWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
} from "@/lib/accounts/pl-compute";
import {
  fromSignedBalance,
  isPostedVoucherStatus,
  openingSignedBalance,
  signedBalanceAfterMovements,
  sortChronological,
} from "@/lib/accounts/running-balance";
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
  matchesMultiFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";

export type BalanceSheetViewType = "summary" | "detailed";

export interface BalanceSheetFilters {
  financialYearId: string;
  asOnDate: string;
  branch: string | string[];
  warehouse: string | string[];
  partyId: string | string[];
  ledgerGroupId: string | string[];
  ledgerId: string | string[];
  viewType: BalanceSheetViewType;
  showZeroBalance: boolean;
  search?: string;
}

export interface ComputedBalanceSheetLedgerRow {
  ledgerId: number;
  ledgerCode: string;
  ledgerName: string;
  amount: number;
  signedBalance: number;
  section: "liabilities" | "assets";
  sortOrder: number;
  ledgerType: ReturnType<typeof resolveLedgerType>;
  partyId: string | null;
  partyKind: "customer" | "vendor" | null;
  accountGroupName: string;
  subGroupName: string;
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

function voucherPassesBalanceSheetFilters(
  voucher: AccountingVoucher,
  filters: BalanceSheetFilters,
): boolean {
  if (!voucherMatchesFinancialYear(voucher, filters.financialYearId)) return false;
  if (voucher.date > filters.asOnDate) return false;
  if (!voucherMatchesDimensionFilters(voucher, {
    branch: filters.branch,
    warehouse: filters.warehouse,
    partyId: filters.partyId,
  })) {
    return false;
  }
  if (filters.warehouse !== "all" && filters.warehouse) {
    const tags = resolveVoucherTransactionTags(voucher);
    if (!tags.warehouse || tags.warehouse !== filters.warehouse) return false;
  }
  return true;
}

function collectVouchersUpToDate(filters: BalanceSheetFilters): AccountingVoucher[] {
  return loadVouchers().filter((v) => {
    if (!isPostedVoucherStatus(v.status)) return false;
    return voucherPassesBalanceSheetFilters(v, filters);
  });
}

function countUnpostedVouchers(asOnDate: string): number {
  return loadVouchers().filter(
    (v) =>
      v.status !== "posted" &&
      v.status !== "approved" &&
      v.date <= asOnDate,
  ).length;
}

function ledgerPassesStructuralFilters(
  ledgerId: number,
  filters: BalanceSheetFilters,
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

function resolvePartyMeta(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): { partyId: string | null; partyKind: "customer" | "vendor" | null } {
  const ledgerType = resolveLedgerType(ledger, records);
  if (ledgerType === "Customer") {
    if (ledger.erpSourceId) {
      return { partyId: `customer:${ledger.erpSourceId}`, partyKind: "customer" };
    }
    const customer = loadCustomers().find(
      (c) =>
        c.customerName.trim().toLowerCase() === ledger.accountName.trim().toLowerCase(),
    );
    if (customer) return { partyId: `customer:${customer.id}`, partyKind: "customer" };
  }
  if (ledgerType === "Vendor") {
    if (ledger.erpSourceId) {
      return { partyId: `vendor:${ledger.erpSourceId}`, partyKind: "vendor" };
    }
    const vendor = getActiveVendors().find(
      (v) =>
        v.vendorName.trim().toLowerCase() === ledger.accountName.trim().toLowerCase(),
    );
    if (vendor) return { partyId: `vendor:${vendor.id}`, partyKind: "vendor" };
  }
  return { partyId: null, partyKind: null };
}

function ledgerMatchesPartyFilter(
  ledger: ChartOfAccount,
  partyId: string | string[],
  records: ChartOfAccount[],
): boolean {
  const meta = resolvePartyMeta(ledger, records);
  return matchesMultiFilter(partyId, meta.partyId);
}

function bsDisplayAmount(
  ledger: ChartOfAccount,
  signedClosing: number,
): number {
  const closing = fromSignedBalance(signedClosing);
  if (ledger.accountType === "Asset" || ledger.accountType === "Expense") {
    return closing.balanceType === "Debit" ? roundMoney(closing.amount) : 0;
  }
  if (ledger.accountType === "Liability" || ledger.accountType === "Equity") {
    return closing.balanceType === "Credit" ? roundMoney(closing.amount) : 0;
  }
  const records = loadChartOfAccounts();
  const ledgerType = resolveLedgerType(ledger, records);
  if (ledgerType === "Customer") {
    return closing.balanceType === "Debit" ? roundMoney(closing.amount) : 0;
  }
  if (ledgerType === "Vendor") {
    return closing.balanceType === "Credit" ? roundMoney(closing.amount) : 0;
  }
  return roundMoney(Math.abs(signedClosing));
}

function buildMovementRows(
  ledger: ChartOfAccount,
  vouchers: AccountingVoucher[],
): { debit: number; credit: number }[] {
  const rows: { date: string; voucherNo: string; debit: number; credit: number }[] = [];
  for (const voucher of vouchers) {
    for (const line of voucher.lines) {
      if (line.ledgerId !== ledger.id) continue;
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

function resolvePrimaryHeadSection(
  records: ChartOfAccount[],
  ledgerId: number,
): "liabilities" | "assets" | null {
  const hierarchy = resolveHierarchyPath(records, ledgerId);
  const head = hierarchy.primaryHead?.accountName;
  if (head === "Assets") return "assets";
  if (head === "Liabilities") return "liabilities";
  return null;
}

function resolveFyDateRange(
  filters: BalanceSheetFilters,
): { dateFrom: string; dateTo: string } {
  if (filters.financialYearId !== "all" && filters.financialYearId) {
    const fy = loadFinancialYears().find(
      (f) => String(f.id) === filters.financialYearId,
    );
    if (fy) {
      return {
        dateFrom: fy.startDate,
        dateTo:
          filters.asOnDate < fy.endDate ? filters.asOnDate : fy.endDate,
      };
    }
  }
  const year = filters.asOnDate.slice(0, 4);
  return { dateFrom: `${year}-04-01`, dateTo: filters.asOnDate };
}

export interface BalanceSheetComputeResult {
  ledgers: ComputedBalanceSheetLedgerRow[];
  netProfit: number;
  unpostedVoucherCount: number;
}

export function computeBalanceSheetLedgerRows(
  filters: BalanceSheetFilters,
): BalanceSheetComputeResult {
  const records = loadChartOfAccounts();
  const vouchers = collectVouchersUpToDate(filters);
  const rows: ComputedBalanceSheetLedgerRow[] = [];
  const partyFilterActive = isMultiFilterActive(filters.partyId);

  for (const ledger of getCoaLedgers()) {
    const section = resolvePrimaryHeadSection(records, ledger.id);
    if (!section) continue;
    if (!isPostingLedger(ledger, records)) continue;
    if (!ledgerPassesStructuralFilters(ledger.id, filters, records)) continue;
    if (partyFilterActive && !ledgerMatchesPartyFilter(ledger, filters.partyId, records)) {
      continue;
    }

    const includeOpening =
      !partyFilterActive || ledgerMatchesPartyFilter(ledger, filters.partyId, records);
    const startSigned = includeOpening ? openingSignedBalance(ledger) : 0;
    const movements = buildMovementRows(ledger, vouchers);
    const signedClosing = signedBalanceAfterMovements(startSigned, movements);
    const amount = bsDisplayAmount(ledger, signedClosing);
    if (amount === 0 && !filters.showZeroBalance) continue;

    const path = resolveHierarchyPath(records, ledger.id);
    const group = path.standardGroup ?? path.accountGroup;
    const partyMeta = resolvePartyMeta(ledger, records);

    rows.push({
      ledgerId: ledger.id,
      ledgerCode: ledger.accountCode,
      ledgerName: ledger.accountName,
      amount,
      signedBalance: signedClosing,
      section,
      sortOrder: group?.id ?? ledger.id,
      ledgerType: resolveLedgerType(ledger, records),
      partyId: partyMeta.partyId,
      partyKind: partyMeta.partyKind,
      accountGroupName: path.accountGroup?.accountName ?? "",
      subGroupName: path.standardGroup?.accountName ?? "",
    });
  }

  const filteredRows = rows;

  const { dateFrom, dateTo } = resolveFyDateRange(filters);
  const netProfit = computePandLNetProfit({
    financialYearId: filters.financialYearId,
    dateFrom,
    dateTo,
    branch: filters.branch,
    warehouse: filters.warehouse,
    partyId: filters.partyId,
  });

  return {
    ledgers: filteredRows.sort(
      (a, b) =>
        a.section.localeCompare(b.section) ||
        a.sortOrder - b.sortOrder ||
        a.ledgerName.localeCompare(b.ledgerName),
    ),
    netProfit,
    unpostedVoucherCount: countUnpostedVouchers(filters.asOnDate),
  };
}

export function getBalanceSheetLedgerGroupOptions(): { id: number; name: string }[] {
  const records = loadChartOfAccounts();
  const assetHead = records.find(
    (r) => r.nodeLevel === "primary_head" && r.accountName === "Assets",
  );
  const liabilityHead = records.find(
    (r) => r.nodeLevel === "primary_head" && r.accountName === "Liabilities",
  );
  const headIds = new Set([assetHead?.id, liabilityHead?.id].filter(Boolean));

  return records
    .filter((r) => r.nodeLevel === "account_group")
    .filter((r) => getAncestorPath(records, r.id).some((n) => headIds.has(n.id)))
    .map((r) => ({ id: r.id, name: r.accountName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getBalanceSheetLedgerOptions(
  ledgerGroupId: string,
): { id: number; name: string }[] {
  const records = loadChartOfAccounts();
  const ledgers = getCoaLedgers().filter((l) => {
    const section = resolvePrimaryHeadSection(records, l.id);
    return section === "assets" || section === "liabilities";
  });
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

export {
  getPandLActivePartyOptions as getBalanceSheetActivePartyOptions,
  getPandLActivePartyOptions as getBalanceSheetPartyOptions,
  getPandLBranchOptions as getBalanceSheetBranchOptions,
  getPandLWarehouseOptions as getBalanceSheetWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
};
