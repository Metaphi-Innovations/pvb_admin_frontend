/**
 * General Ledger — balance logic, particulars formatting, group drill-down.
 * Shared across GL report UI and drill-down links from financial statements.
 */

import {
  getPostableCoaAccounts,
  loadChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import {
  loadVouchers,
  type AccountingVoucher,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { collectLedgerRawCoaTransactions } from "@/lib/accounts/coa-accounting-view";
import { resolveHierarchyPath } from "@/lib/accounts/coa-hierarchy";
import {
  parentGroupLabel,
  resolveLedgerType,
  type LedgerTypeLabel,
} from "@/lib/accounts/ledger-detail-utils";
import {
  computeClosingFromPeriodOpening,
  computePeriodOpeningBalance,
  ledgerMovementMapForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";
import {
  isMultiFilterActive,
  matchesVoucherTypeFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import { isLedgerMovementVoucherStatus } from "@/lib/accounts/running-balance";
import {
  voucherMatchesBranchWarehouse,
  voucherMatchesParty,
} from "@/lib/accounts/trial-balance-voucher-tags";
import { computeTrialBalanceLedgerRows } from "@/lib/accounts/trial-balance-compute";
import type {
  GeneralLedgerDisplayRow,
  GeneralLedgerFilters,
  GeneralLedgerGroupChildRow,
  GeneralLedgerGroupDrillDown,
  GeneralLedgerLedgerType,
  GeneralLedgerRowKind,
  GeneralLedgerStatement,
  GeneralLedgerSummary,
} from "@/lib/accounts/general-ledger-types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GL_EMPTY = "—";

export function formatGeneralLedgerDate(iso: string): string {
  if (!iso) return GL_EMPTY;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${MONTHS[parseInt(m, 10) - 1]}-${y}`;
}

function signedBalance(amount: number, side: BalanceSide): number {
  return side === "Debit" ? amount : -amount;
}

function balanceFromSigned(value: number): { amount: number; balanceType: BalanceSide } {
  if (value >= 0) return { amount: roundMoney(value), balanceType: "Debit" };
  return { amount: roundMoney(Math.abs(value)), balanceType: "Credit" };
}

function applyMovement(
  current: { amount: number; balanceType: BalanceSide },
  debit: number,
  credit: number,
): { amount: number; balanceType: BalanceSide } {
  const signed = signedBalance(current.amount, current.balanceType) + debit - credit;
  return balanceFromSigned(signed);
}

function mapLedgerType(label: LedgerTypeLabel): GeneralLedgerLedgerType {
  if (label === "Customer") return "Customer";
  if (label === "Vendor") return "Vendor";
  if (label === "Bank") return "Bank";
  if (label === "Cash") return "Cash";
  if (label === "Sales") return "Sales";
  if (label === "Purchase") return "Purchase";
  if (label === "GST") return "GST";
  if (label === "Inventory") return "Inventory";
  if (label === "Expense") return "Expense";
  if (label === "Income") return "Income";
  if (label === "Employee Payable") return "Employee";
  return "General";
}

export function resolveContraLedgerNames(
  voucher: AccountingVoucher,
  ledgerId: number,
  lineOrder: number,
  currentLine: VoucherLine,
): string[] {
  const oppositeIsDebit = currentLine.credit > 0;
  const candidates = voucher.lines.filter(
    (l, idx) =>
      l.ledgerId !== ledgerId &&
      idx !== lineOrder &&
      (oppositeIsDebit ? l.debit > 0 : l.credit > 0),
  );

  if (candidates.length > 0) {
    return candidates
      .map((l) => l.contactName || l.ledgerName)
      .filter((n): n is string => Boolean(n?.trim()));
  }

  const fallback = voucher.lines.find((l) => l.ledgerId !== ledgerId && l.ledgerId);
  return fallback?.contactName || fallback?.ledgerName ? [fallback.contactName || fallback.ledgerName] : [];
}

export function formatGlParticulars(
  kind: GeneralLedgerRowKind,
  debit: number,
  credit: number,
  contraNames: string[],
  closingBalanceType?: BalanceSide,
): string {
  if (kind === "opening") return "By Opening Balance";
  if (kind === "closing") {
    return closingBalanceType === "Debit" ? "To Closing Balance" : "By Closing Balance";
  }

  const main = contraNames[0] ?? "—";
  const suffix =
    contraNames.length > 1 ? ` + ${contraNames.length - 1} more` : "";

  if (debit > 0) return `To ${main}${suffix}`;
  if (credit > 0) return `By ${main}${suffix}`;
  return main;
}

function voucherMap(): Map<number, AccountingVoucher> {
  return new Map(
    loadVouchers()
      .filter((v) => isLedgerMovementVoucherStatus(v.status))
      .map((v) => [v.id, v]),
  );
}

function voucherPassesEntityFilters(
  voucher: AccountingVoucher,
  filters: GeneralLedgerFilters,
): boolean {
  const branches = normalizeMultiFilter(filters.branch);
  const warehouses = normalizeMultiFilter(filters.warehouse);
  const parties = normalizeMultiFilter(filters.partyId);

  if (branches.length > 0 || warehouses.length > 0) {
    if (!voucherMatchesBranchWarehouse(voucher, branches, warehouses)) return false;
  }

  if (parties.length > 0) {
    if (!voucherMatchesParty(voucher, parties)) return false;
  }

  return true;
}

function collectFilteredLedgerTransactions(
  ledger: ChartOfAccount,
  filters: GeneralLedgerFilters,
) {
  const raw = collectLedgerRawCoaTransactions(ledger);
  const vouchers = voucherMap();
  const hasEntityFilters =
    isMultiFilterActive(filters.branch) ||
    isMultiFilterActive(filters.warehouse) ||
    isMultiFilterActive(filters.partyId);

  if (!hasEntityFilters) return raw;

  return raw.filter((row) => {
    if (!row.voucherId) return true;
    const voucher = vouchers.get(row.voucherId);
    return voucher ? voucherPassesEntityFilters(voucher, filters) : true;
  });
}

interface EnrichedPeriodRow {
  date: string;
  voucherNo: string;
  voucherType: string;
  voucherTypeCode: VoucherTypeCode | null;
  transactionType: string;
  partyName: string;
  particulars: string;
  particularsNarration: string;
  debit: number;
  credit: number;
  referenceNo: string;
  voucherId?: number;
  lineOrder?: number;
  viewHref?: string;
  viewLabel?: string;
  particular: string;
  narration: string;
}

function enrichPeriodRow(
  row: ReturnType<typeof collectLedgerRawCoaTransactions>[number],
  ledgerId: number,
  vouchers: Map<number, AccountingVoucher>,
): EnrichedPeriodRow {
  const voucher = row.voucherId ? vouchers.get(row.voucherId) : undefined;
  const lineOrder = row.lineOrder ?? 0;
  const line = voucher?.lines[lineOrder];
  const contraNames =
    voucher && line ? resolveContraLedgerNames(voucher, ledgerId, lineOrder, line) : [];
  const particular = contraNames[0] ?? GL_EMPTY;
  const narration =
    voucher?.narration?.trim() || line?.remarks?.trim() || row.narration || GL_EMPTY;
  const particulars = formatGlParticulars("transaction", row.debit, row.credit, contraNames);
  const voucherTypeCode = voucher?.voucherType ?? null;
  const transactionType = voucherTypeCode
    ? (VOUCHER_TYPE_LABELS[voucherTypeCode] ?? voucherTypeCode)
    : row.voucherType;

  return {
    date: row.date,
    voucherNo: row.voucherNo,
    voucherType: row.voucherType,
    voucherTypeCode,
    transactionType,
    partyName: particular,
    particulars,
    particularsNarration: narration,
    debit: row.debit,
    credit: row.credit,
    referenceNo: row.referenceNo,
    voucherId: row.voucherId,
    lineOrder: row.lineOrder,
    viewHref: row.viewHref,
    viewLabel: row.viewLabel,
    particular,
    narration,
  };
}

function matchesSearch(row: EnrichedPeriodRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.voucherNo,
    row.partyName,
    row.particulars,
    row.particularsNarration,
    row.particular,
    row.narration,
    row.referenceNo,
    row.voucherType,
    row.transactionType,
    String(row.debit),
    String(row.credit),
  ].some((v) => v.toLowerCase().includes(q));
}

function matchesTransactionType(row: EnrichedPeriodRow, transactionType: string | string[]): boolean {
  return matchesVoucherTypeFilter(transactionType, row.voucherTypeCode);
}

function matchesDebitCredit(row: EnrichedPeriodRow, side: GeneralLedgerFilters["debitCredit"]): boolean {
  if (!side || side === "all") return true;
  if (side === "debit") return row.debit > 0;
  return row.credit > 0;
}

function computeGrandTotals(
  totalDebit: number,
  totalCredit: number,
  closing: { amount: number; balanceType: BalanceSide },
): { grandTotalDebit: number; grandTotalCredit: number } {
  const closingDebit = closing.balanceType === "Debit" ? closing.amount : 0;
  const closingCredit = closing.balanceType === "Credit" ? closing.amount : 0;
  return {
    grandTotalDebit: roundMoney(totalDebit + closingDebit),
    grandTotalCredit: roundMoney(totalCredit + closingCredit),
  };
}

function getLedgerById(ledgerId: string): ChartOfAccount | null {
  const numericId = Number(ledgerId);
  if (!Number.isFinite(numericId)) return null;
  return loadChartOfAccounts().find((r) => r.id === numericId && r.nodeLevel === "ledger") ?? null;
}

export function buildGeneralLedgerStatementFromLedger(
  ledgerId: string,
  filters: GeneralLedgerFilters,
  enrichFields?: (
    row: EnrichedPeriodRow,
    ledger: ChartOfAccount,
  ) => Partial<GeneralLedgerDisplayRow>,
): GeneralLedgerStatement | null {
  const ledger = getLedgerById(ledgerId);
  if (!ledger) return null;

  const records = loadChartOfAccounts();
  const parentGroup = parentGroupLabel(records, ledger);
  const ledgerType = mapLedgerType(resolveLedgerType(ledger, records));
  const vouchers = voucherMap();
  const raw = collectFilteredLedgerTransactions(ledger, filters);

  const periodOpening = computePeriodOpeningBalance(ledger, raw, filters.dateFrom);

  const periodTransactions = raw.filter(
    (t) => t.date >= filters.dateFrom && t.date <= filters.dateTo,
  );

  const enrichedPeriod = periodTransactions.map((row) =>
    enrichPeriodRow(row, ledger.id, vouchers),
  );

  const hasActiveFilters =
    isMultiFilterActive(filters.voucherType) ||
    isMultiFilterActive(filters.transactionType) ||
    Boolean(filters.debitCredit && filters.debitCredit !== "all") ||
    Boolean(filters.search?.trim());

  const filteredTransactions = enrichedPeriod.filter(
    (row) =>
      matchesVoucherTypeFilter(filters.voucherType, row.voucherTypeCode) &&
      matchesTransactionType(row, filters.transactionType ?? []) &&
      matchesDebitCredit(row, filters.debitCredit) &&
      matchesSearch(row, filters.search ?? ""),
  );

  const totalsSource = hasActiveFilters ? filteredTransactions : enrichedPeriod;
  const totalDebit = roundMoney(totalsSource.reduce((s, t) => s + t.debit, 0));
  const totalCredit = roundMoney(totalsSource.reduce((s, t) => s + t.credit, 0));

  const periodDebitAll = roundMoney(enrichedPeriod.reduce((s, t) => s + t.debit, 0));
  const periodCreditAll = roundMoney(enrichedPeriod.reduce((s, t) => s + t.credit, 0));
  const closing = computeClosingFromPeriodOpening(periodOpening, periodDebitAll, periodCreditAll);
  const grandTotals = computeGrandTotals(periodDebitAll, periodCreditAll, closing);

  let running = { ...periodOpening };
  const transactionRows: GeneralLedgerDisplayRow[] = filteredTransactions.map((t) => {
    running = applyMovement(running, t.debit, t.credit);
    const base: GeneralLedgerDisplayRow = {
      kind: "transaction",
      date: formatGeneralLedgerDate(t.date),
      isoDate: t.date,
      voucherNo: t.voucherNo,
      voucherType: t.voucherType,
      transactionType: t.transactionType,
      partyName: t.partyName,
      gstin: GL_EMPTY,
      pan: GL_EMPTY,
      expenseHead: GL_EMPTY,
      particulars: t.particulars,
      particularsNarration: t.particularsNarration,
      debit: t.debit,
      credit: t.credit,
      bankCash: GL_EMPTY,
      tdsSection: GL_EMPTY,
      tdsAmount: null,
      gstAmount: null,
      referenceNo: t.referenceNo,
      runningBalance: running.amount,
      runningBalanceType: running.balanceType,
      voucherId: t.voucherId,
      lineOrder: t.lineOrder,
      viewHref: t.viewHref,
      viewLabel: t.viewLabel,
      particular: t.particular,
      narration: t.narration,
    };
    return enrichFields ? { ...base, ...enrichFields(t, ledger) } : base;
  });

  const openingParticulars = formatGlParticulars("opening", 0, 0, []);
  const openingRow: GeneralLedgerDisplayRow = {
    kind: "opening",
    date: formatGeneralLedgerDate(filters.dateFrom),
    isoDate: filters.dateFrom,
    voucherNo: GL_EMPTY,
    voucherType: "Opening",
    transactionType: "Opening",
    partyName: GL_EMPTY,
    gstin: GL_EMPTY,
    pan: GL_EMPTY,
    expenseHead: GL_EMPTY,
    particulars: openingParticulars,
    particularsNarration: openingParticulars,
    debit: periodOpening.balanceType === "Debit" ? periodOpening.amount : 0,
    credit: periodOpening.balanceType === "Credit" ? periodOpening.amount : 0,
    bankCash: GL_EMPTY,
    tdsSection: GL_EMPTY,
    tdsAmount: null,
    gstAmount: null,
    referenceNo: GL_EMPTY,
    runningBalance: periodOpening.amount,
    runningBalanceType: periodOpening.balanceType,
    particular: openingParticulars,
    narration: openingParticulars,
  };

  const closingParticulars = formatGlParticulars(
    "closing",
    0,
    0,
    [],
    closing.balanceType,
  );
  const closingDebit = closing.balanceType === "Debit" ? closing.amount : 0;
  const closingCredit = closing.balanceType === "Credit" ? closing.amount : 0;
  const closingRow: GeneralLedgerDisplayRow = {
    kind: "closing",
    date: formatGeneralLedgerDate(filters.dateTo),
    isoDate: filters.dateTo,
    voucherNo: GL_EMPTY,
    voucherType: GL_EMPTY,
    transactionType: GL_EMPTY,
    partyName: GL_EMPTY,
    gstin: GL_EMPTY,
    pan: GL_EMPTY,
    expenseHead: GL_EMPTY,
    particulars: closingParticulars,
    particularsNarration: closingParticulars,
    debit: closingDebit,
    credit: closingCredit,
    runningBalance: closing.amount,
    runningBalanceType: closing.balanceType,
    bankCash: GL_EMPTY,
    tdsSection: GL_EMPTY,
    tdsAmount: null,
    gstAmount: null,
    referenceNo: GL_EMPTY,
    particular: closingParticulars,
    narration: closingParticulars,
  };

  const summary: GeneralLedgerSummary = {
    ledgerId,
    ledgerName: ledger.accountName,
    ledgerCode: ledger.accountCode,
    ledgerType,
    parentGroup,
    gstin: GL_EMPTY,
    pan: GL_EMPTY,
    openingBalance: periodOpening.amount,
    openingBalanceType: periodOpening.balanceType,
    totalDebit,
    totalCredit,
    closingBalance: closing.amount,
    closingBalanceType: closing.balanceType,
    currentBalance: closing.amount,
    currentBalanceType: closing.balanceType,
    grandTotalDebit: grandTotals.grandTotalDebit,
    grandTotalCredit: grandTotals.grandTotalCredit,
  };

  return {
    summary,
    transactionRows,
    displayRows: [openingRow, ...transactionRows, closingRow],
    hasPeriodTransactions: periodTransactions.length > 0,
  };
}

function splitClosing(amount: number, balanceType: BalanceSide): { debit: number; credit: number } {
  if (balanceType === "Debit") return { debit: amount, credit: 0 };
  return { debit: 0, credit: amount };
}

export function buildGeneralLedgerGroupDrillDown(
  groupId: number,
  filters: GeneralLedgerFilters,
): GeneralLedgerGroupDrillDown | null {
  const records = loadChartOfAccounts();
  const group = records.find((r) => r.id === groupId);
  if (!group) return null;

  const directChildren = records.filter((r) => r.parentAccountId === groupId);
  const tbRows = computeTrialBalanceLedgerRows({
    financialYearId: filters.financialYearId ?? "all",
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    branch: filters.branch ?? [],
    warehouse: filters.warehouse ?? [],
    ledgerGroupId: String(groupId),
    ledgerId: [],
    showZeroBalance: true,
    search: filters.search,
  });

  const ledgerTotals = new Map(
    tbRows.map((r) => [
      r.ledgerId,
      {
        openingDebit: r.openingDebit,
        openingCredit: r.openingCredit,
        debit: r.debit,
        credit: r.credit,
        closingDebit: r.closingDebit,
        closingCredit: r.closingCredit,
      },
    ]),
  );

  const childGroups = directChildren.filter((r) => r.nodeLevel === "account_group");
  const childLedgers = directChildren.filter((r) => r.nodeLevel === "ledger");

  const children: GeneralLedgerGroupChildRow[] = [];

  for (const g of childGroups) {
    const descendantLedgerIds = getPostableCoaAccounts(records)
      .filter((l) => {
        const path = resolveHierarchyPath(records, l.id);
        return path.path.some((n) => n.id === g.id);
      })
      .map((l) => l.id);

    const totals = descendantLedgerIds.reduce(
      (acc, id) => {
        const row = ledgerTotals.get(id);
        if (!row) return acc;
        return {
          openingDebit: acc.openingDebit + row.openingDebit,
          openingCredit: acc.openingCredit + row.openingCredit,
          debit: acc.debit + row.debit,
          credit: acc.credit + row.credit,
          closingDebit: acc.closingDebit + row.closingDebit,
          closingCredit: acc.closingCredit + row.closingCredit,
        };
      },
      { openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
    );

    const netClosing = totals.closingDebit - totals.closingCredit;
    children.push({
      id: g.id,
      code: g.accountCode,
      name: g.accountName,
      nodeLevel: "account_group",
      ...totals,
      closingBalanceType: netClosing >= 0 ? "Debit" : "Credit",
    });
  }

  for (const l of childLedgers) {
    const row = ledgerTotals.get(l.id);
    const totals = row ?? {
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
    };
    const netClosing = totals.closingDebit - totals.closingCredit;
    children.push({
      id: l.id,
      code: l.accountCode,
      name: l.accountName,
      nodeLevel: "ledger",
      ...totals,
      closingBalanceType: netClosing >= 0 ? "Debit" : "Credit",
    });
  }

  const groupTotals = children.reduce(
    (acc, c) => ({
      openingDebit: acc.openingDebit + c.openingDebit,
      openingCredit: acc.openingCredit + c.openingCredit,
      debit: acc.debit + c.debit,
      credit: acc.credit + c.credit,
      closingDebit: acc.closingDebit + c.closingDebit,
      closingCredit: acc.closingCredit + c.closingCredit,
    }),
    { openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
  );

  const hierarchy = resolveHierarchyPath(records, groupId);
  const parent =
    hierarchy.path.filter((n) => n.nodeLevel === "account_group").slice(-2, -1)[0]?.accountName ??
    "—";

  return {
    groupId,
    groupName: group.accountName,
    parentGroup: parent,
    children: children.sort((a, b) => a.name.localeCompare(b.name)),
    totals: groupTotals,
  };
}

export function ledgerClosingMatchesTrialBalance(
  ledgerId: number,
  filters: GeneralLedgerFilters,
): boolean {
  const stmt = buildGeneralLedgerStatementFromLedger(String(ledgerId), filters);
  if (!stmt) return false;

  const movementMap = ledgerMovementMapForRange(filters.dateFrom, filters.dateTo);
  const ledger = getLedgerById(String(ledgerId));
  if (!ledger) return false;

  const raw = collectFilteredLedgerTransactions(ledger, filters);
  const periodOpening = computePeriodOpeningBalance(ledger, raw, filters.dateFrom);
  const movement = movementMap.get(ledger.id) ?? { totalDebit: 0, totalCredit: 0 };
  const closing = computeClosingFromPeriodOpening(
    periodOpening,
    movement.totalDebit,
    movement.totalCredit,
  );

  return (
    stmt.summary.closingBalance === closing.amount &&
    stmt.summary.closingBalanceType === closing.balanceType
  );
}
