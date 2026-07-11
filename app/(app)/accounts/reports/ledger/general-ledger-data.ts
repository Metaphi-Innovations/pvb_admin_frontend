/**
 * General Ledger report — statement builder backed by posted vouchers & COA ledgers.
 * Isolated to Accounts → Reports → General Ledger only.
 */

import { getPostableCoaAccounts, loadChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import {
  loadVouchers,
  type AccountingVoucher,
  type VoucherLine,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { collectLedgerRawCoaTransactions } from "@/lib/accounts/coa-accounting-view";
import {
  parentGroupLabel,
  resolveLedgerType,
  type LedgerTypeLabel,
} from "@/lib/accounts/ledger-detail-utils";
import { loadLedgerMeta } from "@/lib/accounts/ledger-metadata";
import {
  computeClosingFromPeriodOpening,
  computePeriodOpeningBalance,
  ledgerMovementMapForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";
import {
  isMultiFilterActive,
  matchesVoucherTypeFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import { isLedgerMovementVoucherStatus } from "@/lib/accounts/running-balance";
import {
  emptyGeneralLedgerEnrichedFields,
  enrichGeneralLedgerTransactionRow,
  GL_EMPTY,
} from "./general-ledger-row-enrichment";

export type GeneralLedgerLedgerType =
  | "Customer"
  | "Vendor"
  | "Bank"
  | "Cash"
  | "Sales"
  | "Purchase"
  | "GST"
  | "Expense"
  | "Income"
  | "Inventory"
  | "Employee"
  | "General";

export const GENERAL_LEDGER_TYPE_OPTIONS: { value: string; label: GeneralLedgerLedgerType | "All Types" }[] = [
  { value: "all", label: "All Types" },
  { value: "Customer", label: "Customer" },
  { value: "Vendor", label: "Vendor" },
  { value: "Bank", label: "Bank" },
  { value: "Cash", label: "Cash" },
  { value: "Sales", label: "Sales" },
  { value: "Purchase", label: "Purchase" },
  { value: "GST", label: "GST" },
  { value: "Expense", label: "Expense" },
  { value: "Income", label: "Income" },
  { value: "Inventory", label: "Inventory" },
  { value: "Employee", label: "Employee" },
  { value: "General", label: "General" },
];

export interface GeneralLedgerLedgerOption {
  id: string;
  code: string;
  name: string;
  ledgerType: GeneralLedgerLedgerType;
  parentGroup: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
}

export type GeneralLedgerRowKind = "opening" | "transaction" | "closing";

export interface GeneralLedgerDisplayRow {
  kind: GeneralLedgerRowKind;
  date: string;
  voucherNo: string;
  voucherType: string;
  partyName: string;
  gstin: string;
  pan: string;
  expenseHead: string;
  particularsNarration: string;
  debit: number;
  credit: number;
  bankCash: string;
  tdsSection: string;
  tdsAmount: number | null;
  gstAmount: number | null;
  referenceNo: string;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  /** @deprecated Use partyName — kept for search compatibility */
  particular: string;
  /** @deprecated Use particularsNarration */
  narration: string;
}

export interface GeneralLedgerSummary {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string;
  ledgerType: GeneralLedgerLedgerType;
  parentGroup: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
  currentBalance: number;
  currentBalanceType: BalanceSide;
}

export interface GeneralLedgerListingRow {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  ledgerType: GeneralLedgerLedgerType;
  parentGroup: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
  lastTransactionDate: string | null;
}

export interface GeneralLedgerListingFilters {
  dateFrom: string;
  dateTo: string;
  ledgerType: string;
  parentGroup: string;
  search: string;
}

export interface GeneralLedgerStatement {
  summary: GeneralLedgerSummary;
  transactionRows: GeneralLedgerDisplayRow[];
  displayRows: GeneralLedgerDisplayRow[];
  hasPeriodTransactions: boolean;
}

export interface GeneralLedgerFilters {
  dateFrom: string;
  dateTo: string;
  voucherType: string | string[];
  search: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatGeneralLedgerDate(iso: string): string {
  if (!iso) return "—";
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

function voucherMap(): Map<number, AccountingVoucher> {
  return new Map(
    loadVouchers()
      .filter((v) => isLedgerMovementVoucherStatus(v.status))
      .map((v) => [v.id, v]),
  );
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

/** User-facing ledger type label in search dropdowns and summaries. */
export function formatGeneralLedgerTypeLabel(type: GeneralLedgerLedgerType): string {
  return type;
}

export function filterGeneralLedgerLedgers(
  ledgers: GeneralLedgerLedgerOption[],
  query: string,
): GeneralLedgerLedgerOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return ledgers;
  return ledgers.filter((ledger) => {
    const typeLabel = formatGeneralLedgerTypeLabel(ledger.ledgerType);
    return [
      ledger.name,
      ledger.code,
      ledger.ledgerType,
      typeLabel,
      ledger.parentGroup,
    ].some((value) => value.toLowerCase().includes(q));
  });
}

function resolveLedgerTaxFields(ledger: ChartOfAccount): { gstin: string; pan: string } {
  const meta = loadLedgerMeta(ledger.id);
  return {
    gstin: meta.gstin?.trim() || GL_EMPTY,
    pan: meta.pan?.trim() || GL_EMPTY,
  };
}

function resolveLastTransactionDate(
  raw: ReturnType<typeof collectLedgerRawCoaTransactions>,
): string | null {
  if (raw.length === 0) return null;
  return raw.reduce((latest, row) => (row.date > latest ? row.date : latest), raw[0].date);
}

function matchesListingSearch(row: GeneralLedgerListingRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.ledgerCode,
    row.ledgerName,
    row.ledgerType,
    row.parentGroup,
    row.gstin,
    row.pan,
  ].some((v) => v.toLowerCase().includes(q));
}

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

interface EnrichedPeriodRow {
  date: string;
  voucherNo: string;
  voucherType: string;
  voucherTypeCode: VoucherTypeCode | null;
  partyName: string;
  gstin: string;
  pan: string;
  expenseHead: string;
  particularsNarration: string;
  debit: number;
  credit: number;
  bankCash: string;
  tdsSection: string;
  tdsAmount: number | null;
  gstAmount: number | null;
  referenceNo: string;
  /** Legacy search fields */
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
  const particular =
    voucher && line ? resolveContraLedger(voucher, ledgerId, lineOrder, line) : "—";
  const narration =
    voucher?.narration?.trim() || line?.remarks?.trim() || row.narration || GL_EMPTY;

  const enriched = enrichGeneralLedgerTransactionRow(row, particular, voucher);

  return {
    date: row.date,
    voucherNo: row.voucherNo,
    voucherType: row.voucherType,
    voucherTypeCode: voucher?.voucherType ?? null,
    ...enriched,
    debit: row.debit,
    credit: row.credit,
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
    row.gstin,
    row.pan,
    row.expenseHead,
    row.particularsNarration,
    row.particular,
    row.narration,
    row.bankCash,
    row.tdsSection,
    row.referenceNo,
    row.voucherType,
    String(row.debit),
    String(row.credit),
    row.tdsAmount != null ? String(row.tdsAmount) : "",
    row.gstAmount != null ? String(row.gstAmount) : "",
  ].some((v) => v.toLowerCase().includes(q));
}

function matchesVoucherType(row: EnrichedPeriodRow, voucherType: string | string[]): boolean {
  return matchesVoucherTypeFilter(voucherType, row.voucherTypeCode);
}

function getLedgerById(ledgerId: string): ChartOfAccount | null {
  const numericId = Number(ledgerId);
  if (!Number.isFinite(numericId)) return null;
  return loadChartOfAccounts().find((r) => r.id === numericId && r.nodeLevel === "ledger") ?? null;
}

export function getGeneralLedgerLedgers(): GeneralLedgerLedgerOption[] {
  const records = loadChartOfAccounts();
  return getPostableCoaAccounts(records)
    .map((ledger) => ({
      id: String(ledger.id),
      code: ledger.accountCode,
      name: ledger.accountName,
      ledgerType: mapLedgerType(resolveLedgerType(ledger, records)),
      parentGroup: parentGroupLabel(records, ledger),
      openingBalance: ledger.openingBalance,
      openingBalanceType: ledger.balanceType,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getGeneralLedgerLedgerById(id: string): GeneralLedgerLedgerOption | null {
  return getGeneralLedgerLedgers().find((l) => l.id === id) ?? null;
}

export function getGeneralLedgerVoucherTypeOptions(): { value: string; label: string }[] {
  return [
    { value: "all", label: "All types" },
    ...(Object.entries(VOUCHER_TYPE_LABELS) as [VoucherTypeCode, string][]).map(([value, label]) => ({
      value,
      label,
    })),
  ];
}

export function getGeneralLedgerParentGroupOptions(): { value: string; label: string }[] {
  const records = loadChartOfAccounts();
  const groups = new Set<string>();
  for (const ledger of getPostableCoaAccounts(records)) {
    const group = parentGroupLabel(records, ledger);
    if (group && group !== GL_EMPTY) groups.add(group);
  }
  return [
    { value: "all", label: "All groups" },
    ...Array.from(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((g) => ({ value: g, label: g })),
  ];
}

export function buildGeneralLedgerListing(
  filters: GeneralLedgerListingFilters,
): GeneralLedgerListingRow[] {
  const records = loadChartOfAccounts();
  const movementMap = ledgerMovementMapForRange(filters.dateFrom, filters.dateTo);

  const rows = getPostableCoaAccounts(records).map((ledger) => {
    const ledgerType = mapLedgerType(resolveLedgerType(ledger, records));
    const group = parentGroupLabel(records, ledger);
    const tax = resolveLedgerTaxFields(ledger);
    const raw = collectLedgerRawCoaTransactions(ledger);
    const periodOpening = computePeriodOpeningBalance(ledger, raw, filters.dateFrom);
    const movement = movementMap.get(ledger.id) ?? { totalDebit: 0, totalCredit: 0 };
    const closing = computeClosingFromPeriodOpening(
      periodOpening,
      movement.totalDebit,
      movement.totalCredit,
    );

    return {
      ledgerId: String(ledger.id),
      ledgerCode: ledger.accountCode,
      ledgerName: ledger.accountName,
      ledgerType,
      parentGroup: group,
      gstin: tax.gstin,
      pan: tax.pan,
      openingBalance: periodOpening.amount,
      openingBalanceType: periodOpening.balanceType,
      totalDebit: movement.totalDebit,
      totalCredit: movement.totalCredit,
      closingBalance: closing.amount,
      closingBalanceType: closing.balanceType,
      lastTransactionDate: resolveLastTransactionDate(raw),
    };
  });

  return rows
    .filter((row) => {
      if (filters.ledgerType !== "all" && row.ledgerType !== filters.ledgerType) return false;
      if (filters.parentGroup !== "all" && row.parentGroup !== filters.parentGroup) return false;
      return matchesListingSearch(row, filters.search);
    })
    .sort((a, b) => a.ledgerName.localeCompare(b.ledgerName));
}

export function buildGeneralLedgerStatement(
  ledgerId: string,
  filters: GeneralLedgerFilters,
): GeneralLedgerStatement | null {
  const ledger = getLedgerById(ledgerId);
  if (!ledger) return null;

  const records = loadChartOfAccounts();
  const ledgerOption = getGeneralLedgerLedgerById(ledgerId);
  const tax = resolveLedgerTaxFields(ledger);
  const parentGroup = parentGroupLabel(records, ledger);
  const vouchers = voucherMap();
  const raw = collectLedgerRawCoaTransactions(ledger);

  const periodOpening = computePeriodOpeningBalance(ledger, raw, filters.dateFrom);

  const periodTransactions = raw.filter(
    (t) => t.date >= filters.dateFrom && t.date <= filters.dateTo,
  );

  const enrichedPeriod = periodTransactions.map((row) =>
    enrichPeriodRow(row, ledger.id, vouchers),
  );

  const hasActiveFilters =
    isMultiFilterActive(filters.voucherType) || Boolean(filters.search.trim());

  const filteredTransactions = enrichedPeriod.filter(
    (row) => matchesVoucherType(row, filters.voucherType) && matchesSearch(row, filters.search),
  );

  const totalsSource = hasActiveFilters ? filteredTransactions : enrichedPeriod;
  const totalDebit = roundMoney(totalsSource.reduce((s, t) => s + t.debit, 0));
  const totalCredit = roundMoney(totalsSource.reduce((s, t) => s + t.credit, 0));

  const periodDebitAll = roundMoney(enrichedPeriod.reduce((s, t) => s + t.debit, 0));
  const periodCreditAll = roundMoney(enrichedPeriod.reduce((s, t) => s + t.credit, 0));
  const closing = computeClosingFromPeriodOpening(periodOpening, periodDebitAll, periodCreditAll);

  let running = { ...periodOpening };
  const transactionRows: GeneralLedgerDisplayRow[] = filteredTransactions.map((t) => {
    running = applyMovement(running, t.debit, t.credit);
    return {
      kind: "transaction",
      date: formatGeneralLedgerDate(t.date),
      voucherNo: t.voucherNo,
      voucherType: t.voucherType,
      partyName: t.partyName,
      gstin: t.gstin,
      pan: t.pan,
      expenseHead: t.expenseHead,
      particularsNarration: t.particularsNarration,
      debit: t.debit,
      credit: t.credit,
      bankCash: t.bankCash,
      tdsSection: t.tdsSection,
      tdsAmount: t.tdsAmount,
      gstAmount: t.gstAmount,
      referenceNo: t.referenceNo,
      runningBalance: running.amount,
      runningBalanceType: running.balanceType,
      particular: t.particular,
      narration: t.narration,
    };
  });

  const summaryFields = emptyGeneralLedgerEnrichedFields();

  const openingRow: GeneralLedgerDisplayRow = {
    kind: "opening",
    date: formatGeneralLedgerDate(filters.dateFrom),
    voucherNo: GL_EMPTY,
    voucherType: "Opening",
    ...summaryFields,
    particularsNarration: "Opening Balance",
    debit: periodOpening.balanceType === "Debit" ? periodOpening.amount : 0,
    credit: periodOpening.balanceType === "Credit" ? periodOpening.amount : 0,
    runningBalance: periodOpening.amount,
    runningBalanceType: periodOpening.balanceType,
    particular: "Opening Balance",
    narration: "Opening Balance",
  };

  const closingRow: GeneralLedgerDisplayRow = {
    kind: "closing",
    date: formatGeneralLedgerDate(filters.dateTo),
    voucherNo: GL_EMPTY,
    voucherType: GL_EMPTY,
    ...summaryFields,
    particularsNarration: "Closing Balance",
    debit: 0,
    credit: 0,
    runningBalance: closing.amount,
    runningBalanceType: closing.balanceType,
    particular: "Closing Balance",
    narration: "Closing Balance",
  };

  return {
    summary: {
      ledgerId,
      ledgerName: ledger.accountName,
      ledgerCode: ledger.accountCode,
      ledgerType: ledgerOption?.ledgerType ?? mapLedgerType(resolveLedgerType(ledger, records)),
      parentGroup,
      gstin: tax.gstin,
      pan: tax.pan,
      openingBalance: periodOpening.amount,
      openingBalanceType: periodOpening.balanceType,
      totalDebit,
      totalCredit,
      closingBalance: closing.amount,
      closingBalanceType: closing.balanceType,
      currentBalance: closing.amount,
      currentBalanceType: closing.balanceType,
    },
    transactionRows,
    displayRows: [openingRow, ...transactionRows, closingRow],
    hasPeriodTransactions: periodTransactions.length > 0,
  };
}
