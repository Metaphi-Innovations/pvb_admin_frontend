/**
 * Filtered trial balance computation from posted voucher lines.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getCoaLedgers, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";
import {
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
  openingSignedBalance,
  signedBalanceAfterMovements,
  sortChronological,
  toSignedBalance,
} from "@/lib/accounts/running-balance";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  resolveVoucherTransactionTags,
  voucherMatchesBranchWarehouse,
} from "@/lib/accounts/trial-balance-voucher-tags";
import {
  matchesLedgerGroupIdFilter,
  matchesLedgerIdFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";
import { resolveSourceDocumentLink } from "@/lib/accounts/ledger-source-resolver";
import { VOUCHER_TYPE_LABELS } from "@/app/(app)/accounts/vouchers/voucher-data";

export interface TrialBalanceFilters {
  financialYearId: string;
  dateFrom: string;
  dateTo: string;
  branch: string | string[];
  warehouse: string | string[];
  ledgerGroupId: string | string[];
  ledgerId: string | string[];
  showZeroBalance: boolean;
  search?: string;
}

export interface TrialBalanceAmountColumns {
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ComputedTrialBalanceLedgerRow extends TrialBalanceAmountColumns {
  ledgerId: number;
  ledgerCode: string;
  ledgerName: string;
  primaryHead: string;
  primaryHeadId: number;
  primaryHeadSort: number;
  accountGroup: string;
  accountGroupId: number;
  accountGroupSort: number;
  standardGroup: string;
}

function splitBalanceAmount(
  amount: number,
  balanceType: BalanceSide,
): { debit: number; credit: number } {
  const amt = roundMoney(amount);
  if (amt === 0) return { debit: 0, credit: 0 };
  return balanceType === "Debit"
    ? { debit: amt, credit: 0 }
    : { debit: 0, credit: amt };
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

function voucherPassesDimensionFilters(
  voucher: AccountingVoucher,
  filters: TrialBalanceFilters,
): boolean {
  if (!voucherMatchesFinancialYear(voucher, filters.financialYearId)) return false;
  return voucherMatchesBranchWarehouse(voucher, filters.branch, filters.warehouse);
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

function collectFilteredVouchers(
  filters: TrialBalanceFilters,
  options?: { beforeDate?: string; fromDate?: string; toDate?: string },
): AccountingVoucher[] {
  return loadVouchers().filter((v) => {
    if (!isLedgerMovementVoucherStatus(v.status)) return false;
    if (!voucherPassesDimensionFilters(v, filters)) return false;
    if (options?.beforeDate && v.date >= options.beforeDate) return false;
    if (options?.fromDate && v.date < options.fromDate) return false;
    if (options?.toDate && v.date > options.toDate) return false;
    return true;
  });
}

function ledgerPassesStructuralFilters(
  ledgerId: number,
  filters: TrialBalanceFilters,
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

function isZeroBalanceRow(row: TrialBalanceAmountColumns): boolean {
  return (
    row.openingDebit === 0 &&
    row.openingCredit === 0 &&
    row.debit === 0 &&
    row.credit === 0 &&
    row.closingDebit === 0 &&
    row.closingCredit === 0
  );
}

function buildPriorMovementRows(
  ledger: ChartOfAccount,
  priorVouchers: AccountingVoucher[],
): { date: string; voucherNo: string; debit: number; credit: number }[] {
  const rows: { date: string; voucherNo: string; debit: number; credit: number }[] = [];
  for (const voucher of priorVouchers) {
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

export function computeTrialBalanceLedgerRows(
  filters: TrialBalanceFilters,
): ComputedTrialBalanceLedgerRow[] {
  const records = loadChartOfAccounts();
  const codeMap = new Map(
    records.filter((r) => r.nodeLevel === "ledger").map((r) => [r.id, r.accountCode]),
  );

  const periodVouchers = collectFilteredVouchers(filters, {
    fromDate: filters.dateFrom,
    toDate: filters.dateTo,
  });
  const priorVouchers = collectFilteredVouchers(filters, {
    beforeDate: filters.dateFrom,
  });

  const periodMap = aggregateVoucherLines(periodVouchers);
  const rows: ComputedTrialBalanceLedgerRow[] = [];

  for (const ledger of getCoaLedgers()) {
    if (!ledgerPassesStructuralFilters(ledger.id, filters, records)) continue;

    const hierarchy = resolveHierarchyPath(records, ledger.id);
    const primaryHead = hierarchy.primaryHead;
    const accountGroup = hierarchy.accountGroup ?? hierarchy.standardGroup;
    if (!primaryHead || !accountGroup) continue;

    const priorRows = buildPriorMovementRows(ledger, priorVouchers);
    const periodOpeningSigned =
      signedBalanceAfterMovements(openingSignedBalance(ledger), priorRows);
    const periodOpening = fromSignedBalance(periodOpeningSigned);
    const openingSplit = splitBalanceAmount(
      periodOpening.amount,
      periodOpening.balanceType,
    );

    const movement = periodMap.get(ledger.id) ?? { debit: 0, credit: 0 };
    const periodDebit = roundMoney(movement.debit);
    const periodCredit = roundMoney(movement.credit);

    const closingSigned = periodOpeningSigned + periodDebit - periodCredit;
    const closing = fromSignedBalance(closingSigned);
    const closingSplit = splitBalanceAmount(closing.amount, closing.balanceType);

    const row: ComputedTrialBalanceLedgerRow = {
      ledgerId: ledger.id,
      ledgerCode: codeMap.get(ledger.id) ?? "",
      ledgerName: ledger.accountName,
      primaryHead: primaryHead.accountName,
      primaryHeadId: primaryHead.id,
      primaryHeadSort: primaryHead.id,
      accountGroup: accountGroup.accountName,
      accountGroupId: accountGroup.id,
      accountGroupSort: accountGroup.id,
      standardGroup: hierarchy.standardGroup?.accountName ?? accountGroup.accountName,
      openingDebit: openingSplit.debit,
      openingCredit: openingSplit.credit,
      debit: periodDebit,
      credit: periodCredit,
      closingDebit: closingSplit.debit,
      closingCredit: closingSplit.credit,
    };

    if (!filters.showZeroBalance && isZeroBalanceRow(row)) continue;

    const q = (filters.search ?? "").trim().toLowerCase();
    if (q) {
      const haystack = `${row.ledgerName} ${row.ledgerCode} ${row.accountGroup} ${row.primaryHead}`.toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    rows.push(row);
  }

  return rows.sort(
    (a, b) =>
      a.primaryHeadSort - b.primaryHeadSort ||
      a.accountGroupSort - b.accountGroupSort ||
      a.ledgerName.localeCompare(b.ledgerName),
  );
}

export function sumTrialBalanceColumns(
  rows: Pick<
    ComputedTrialBalanceLedgerRow,
    | "openingDebit"
    | "openingCredit"
    | "debit"
    | "credit"
    | "closingDebit"
    | "closingCredit"
  >[],
): TrialBalanceAmountColumns {
  return rows.reduce(
    (acc, r) => ({
      openingDebit: roundMoney(acc.openingDebit + r.openingDebit),
      openingCredit: roundMoney(acc.openingCredit + r.openingCredit),
      debit: roundMoney(acc.debit + r.debit),
      credit: roundMoney(acc.credit + r.credit),
      closingDebit: roundMoney(acc.closingDebit + r.closingDebit),
      closingCredit: roundMoney(acc.closingCredit + r.closingCredit),
    }),
    {
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
    },
  );
}

export interface TrialBalanceVoucherException {
  voucherId: number;
  voucherNo: string;
  date: string;
  voucherTypeLabel: string;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  viewHref: string;
}

/**
 * Voucher-level double-entry validation. Returns posted/approved vouchers whose
 * total debit ≠ total credit (checked across ALL lines, including any without a
 * ledger mapping). These are genuine accounting exceptions — not plugged into the
 * report totals, but surfaced so the source voucher can be corrected.
 */
export function findTrialBalanceExceptions(
  filters: TrialBalanceFilters,
): TrialBalanceVoucherException[] {
  const exceptions: TrialBalanceVoucherException[] = [];

  for (const voucher of loadVouchers()) {
    if (!isLedgerMovementVoucherStatus(voucher.status)) continue;
    if (!voucherPassesDimensionFilters(voucher, filters)) continue;
    // Closing balances depend on every voucher up to the end date.
    if (filters.dateTo && voucher.date > filters.dateTo) continue;

    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of voucher.lines) {
      totalDebit += Number(line.debit) || 0;
      totalCredit += Number(line.credit) || 0;
    }
    totalDebit = roundMoney(totalDebit);
    totalCredit = roundMoney(totalCredit);
    const difference = roundMoney(totalDebit - totalCredit);
    if (difference === 0) continue;

    exceptions.push({
      voucherId: voucher.id,
      voucherNo: statementVoucherNo(voucher),
      date: voucher.date,
      voucherTypeLabel: VOUCHER_TYPE_LABELS[voucher.voucherType] ?? voucher.voucherType,
      totalDebit,
      totalCredit,
      difference,
      viewHref: resolveSourceDocumentLink(voucher).href,
    });
  }

  return exceptions.sort((a, b) => a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo));
}

export function getTrialBalanceLedgerGroupOptions(): { id: number; name: string }[] {
  return loadChartOfAccounts()
    .filter((r) => r.nodeLevel === "account_group")
    .map((r) => ({ id: r.id, name: r.accountName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getTrialBalanceLedgerOptions(
  ledgerGroupId: string,
): { id: number; name: string }[] {
  const records = loadChartOfAccounts();
  const ledgers = getCoaLedgers();
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

/** Dynamic branch / warehouse options from tagged source documents + vouchers. */
export function getTrialBalanceBranchOptions(): string[] {
  const branches = new Set<string>();
  for (const voucher of loadVouchers()) {
    if (!isLedgerMovementVoucherStatus(voucher.status)) continue;
    const { branch } = resolveVoucherTransactionTags(voucher);
    if (branch) branches.add(branch);
  }
  for (const inv of loadInvoices()) {
    if (inv.branch?.trim()) branches.add(inv.branch.trim());
  }
  return [...branches].sort((a, b) => a.localeCompare(b));
}

export function getTrialBalanceWarehouseOptions(): string[] {
  const warehouses = new Set<string>();
  for (const voucher of loadVouchers()) {
    if (!isLedgerMovementVoucherStatus(voucher.status)) continue;
    const { warehouse } = resolveVoucherTransactionTags(voucher);
    if (warehouse) warehouses.add(warehouse);
  }
  for (const inv of loadInvoices()) {
    if (inv.warehouse?.trim()) warehouses.add(inv.warehouse.trim());
  }
  return [...warehouses].sort((a, b) => a.localeCompare(b));
}
