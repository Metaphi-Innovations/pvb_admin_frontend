import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getPostableCoaAccounts, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";
import {
  collectLedgerRawCoaTransactions,
  type CoaTransactionRow,
} from "@/lib/accounts/coa-accounting-view";
import {
  buildCoaTransactionsForDateRange,
  computeClosingFromPeriodOpening,
  computePeriodOpeningBalance,
  ledgerMovementMapForRange,
  ledgerMovementTotalsForRange,
  type LedgerDateRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import {
  loadVouchers,
  type AccountingVoucher,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { isLedgerMovementVoucherStatus } from "@/lib/accounts/running-balance";

export const GENERAL_LEDGER_HREF = "/accounts/reports/ledger";

export function buildGeneralLedgerHref(ledgerId: number): string {
  return `${GENERAL_LEDGER_HREF}?ledger=${ledgerId}`;
}

export interface GeneralLedgerRow extends CoaTransactionRow {
  contraLedger: string;
}

export interface GeneralLedgerMeta {
  ledger: ChartOfAccount;
  ledgerName: string;
  ledgerCode: string;
  primaryHead: string;
  groupPath: string;
  openingBalance: number;
  openingBalanceType: "Debit" | "Credit";
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

export interface GeneralLedgerStatement {
  meta: GeneralLedgerMeta;
  rows: GeneralLedgerRow[];
}

const VOUCHER_BY_ID = () =>
  new Map(
    loadVouchers()
      .filter((v) => isLedgerMovementVoucherStatus(v.status))
      .map((v) => [v.id, v]),
  );

function resolveContraLedger(
  voucher: AccountingVoucher,
  ledgerId: number,
  lineOrder: number,
  currentLine: VoucherLine,
): string {
  const oppositeIsDebit = currentLine.credit > 0;
  const candidates = voucher.lines.filter(
    (l, idx) =>
      l.ledgerId !== ledgerId &&
      idx !== lineOrder &&
      (oppositeIsDebit ? l.debit > 0 : l.credit > 0),
  );

  if (candidates.length === 1) {
    return candidates[0].contactName || candidates[0].ledgerName || "—";
  }

  if (candidates.length > 1) {
    return candidates
      .map((l) => l.contactName || l.ledgerName)
      .filter(Boolean)
      .join(", ");
  }

  const fallback = voucher.lines.find((l) => l.ledgerId !== ledgerId && l.ledgerId);
  return fallback?.contactName || fallback?.ledgerName || "—";
}

function enrichWithContra(
  rows: CoaTransactionRow[],
  ledgerId: number,
): GeneralLedgerRow[] {
  const voucherMap = VOUCHER_BY_ID();

  return rows.map((row) => {
    if (row.isOpeningRow) {
      return { ...row, contraLedger: "Opening Balance", narration: row.narration || "Opening Balance" };
    }

    const voucher = row.voucherId ? voucherMap.get(row.voucherId) : undefined;
    const lineOrder = row.lineOrder ?? 0;
    const line = voucher?.lines[lineOrder];

    const contraLedger =
      voucher && line
        ? resolveContraLedger(voucher, ledgerId, lineOrder, line)
        : "—";

    const narration =
      voucher?.narration?.trim() ||
      line?.remarks?.trim() ||
      row.narration ||
      "—";

    return {
      ...row,
      contraLedger,
      narration,
    };
  });
}

function matchesSearch(row: GeneralLedgerRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (row.isOpeningRow) return false;

  return [
    row.voucherNo,
    row.voucherType,
    row.contraLedger,
    row.narration,
    row.referenceNo,
    String(row.debit),
    String(row.credit),
  ].some((v) => v.toLowerCase().includes(q));
}

export function resolveLedgerIdByName(name: string): number | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "—") return null;

  const records = loadChartOfAccounts();
  const exact = records.find(
    (r) => r.nodeLevel === "ledger" && r.accountName.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact.id;

  const partial = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      (r.accountName.toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes(r.accountName.toLowerCase())),
  );
  return partial?.id ?? null;
}

export function getGeneralLedgerLedgers(): { id: number; name: string }[] {
  return getPostableCoaAccounts()
    .map((a) => ({ id: a.id, name: a.accountName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getLedgerById(id: number): ChartOfAccount | null {
  return loadChartOfAccounts().find((r) => r.id === id && r.nodeLevel === "ledger") ?? null;
}

export interface GeneralLedgerListRow {
  ledgerId: number;
  ledgerName: string;
  ledgerCode: string;
  primaryHead: string;
  groupPath: string;
  openingBalance: number;
  openingBalanceType: "Debit" | "Credit";
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: "Debit" | "Credit";
}

export interface GeneralLedgerStatementFilters {
  search?: string;
}

function matchesLedgerMeta(row: GeneralLedgerListRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.ledgerName, row.ledgerCode, row.primaryHead, row.groupPath].some((v) =>
    v.toLowerCase().includes(q),
  );
}

function ledgerHasTransactionSearchMatch(
  ledger: ChartOfAccount,
  range: LedgerDateRange,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const stmt = buildGeneralLedgerStatement(ledger, range, { search: q });
  return stmt.rows.some((r) => !r.isOpeningRow);
}

/** All postable ledgers with period movement — optional universal search. */
export function buildGeneralLedgerListing(
  range: LedgerDateRange,
  search = "",
): GeneralLedgerListRow[] {
  const records = loadChartOfAccounts();
  const movementMap = ledgerMovementMapForRange(range.from, range.to);
  const q = search.trim();

  const rows = getPostableCoaAccounts().map((ledger) => {
    const hierarchy = resolveHierarchyPath(records, ledger.id);
    const groupPath =
      hierarchy.path
        .filter((n) => n.nodeLevel === "account_group")
        .map((n) => n.accountName)
        .join(" › ") || "—";
    const raw = collectLedgerRawCoaTransactions(ledger);
    const periodOpening = computePeriodOpeningBalance(ledger, raw, range.from);
    const movement = movementMap.get(ledger.id) ?? { totalDebit: 0, totalCredit: 0 };
    const closing = computeClosingFromPeriodOpening(
      periodOpening,
      movement.totalDebit,
      movement.totalCredit,
    );

    return {
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      primaryHead: hierarchy.primaryHead?.accountName ?? "—",
      groupPath,
      openingBalance: periodOpening.amount,
      openingBalanceType: periodOpening.balanceType,
      totalDebit: movement.totalDebit,
      totalCredit: movement.totalCredit,
      closingBalance: closing.amount,
      closingBalanceType: closing.balanceType,
    };
  });

  if (!q) {
    return rows.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName));
  }

  return rows
    .filter((row) => {
      if (matchesLedgerMeta(row, q)) return true;
      const ledger = getLedgerById(row.ledgerId);
      return ledger ? ledgerHasTransactionSearchMatch(ledger, range, q) : false;
    })
    .sort((a, b) => a.ledgerName.localeCompare(b.ledgerName));
}

export function buildGeneralLedgerStatement(
  ledger: ChartOfAccount,
  range: LedgerDateRange,
  filters: GeneralLedgerStatementFilters = {},
): GeneralLedgerStatement {
  const records = loadChartOfAccounts();
  const hierarchy = resolveHierarchyPath(records, ledger.id);
  const groupPath =
    hierarchy.path
      .filter((n) => n.nodeLevel === "account_group")
      .map((n) => n.accountName)
      .join(" › ") || "—";

  const effectiveRange = range;
  const raw = collectLedgerRawCoaTransactions(ledger);
  const { totalDebit, totalCredit } = ledgerMovementTotalsForRange(
    raw,
    effectiveRange.from,
    effectiveRange.to,
  );

  const statementRows = buildCoaTransactionsForDateRange(
    ledger,
    raw,
    effectiveRange.from,
    effectiveRange.to,
  );

  const rows = enrichWithContra(statementRows, ledger.id).filter((row) =>
    matchesSearch(row, filters.search ?? ""),
  );

  const periodOpening = rows.find((r) => r.isOpeningRow);
  const openingBalance = periodOpening?.runningBalance ?? ledger.openingBalance;
  const openingBalanceType = periodOpening?.runningBalanceType ?? ledger.balanceType;
  const closing = computeClosingFromPeriodOpening(
    { amount: openingBalance, balanceType: openingBalanceType },
    totalDebit,
    totalCredit,
  );

  const movementRows = rows.filter((r) => !r.isOpeningRow);
  const filteredDebit = movementRows.reduce((s, r) => s + r.debit, 0);
  const filteredCredit = movementRows.reduce((s, r) => s + r.credit, 0);

  return {
    meta: {
      ledger,
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      primaryHead: hierarchy.primaryHead?.accountName ?? "—",
      groupPath,
      openingBalance,
      openingBalanceType,
      totalDebit: filters.search?.trim() ? filteredDebit : totalDebit,
      totalCredit: filters.search?.trim() ? filteredCredit : totalCredit,
      closingBalance: closing.amount,
      closingBalanceType: closing.balanceType,
    },
    rows,
  };
}

export function defaultGeneralLedgerDemoLedgerId(): number | null {
  return resolveLedgerIdByName("ABC Agro Distributor");
}
