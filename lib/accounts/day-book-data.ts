import {
  ensureFinancialYearsCurrent,
  loadFinancialYears,
} from "@/app/(app)/accounts/masters/masters-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  formatGlParticulars,
  resolveContraLedgerNames,
} from "@/lib/accounts/general-ledger-compute";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";
import {
  applyMovement,
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
} from "@/lib/accounts/running-balance";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";
import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";
import {
  isMultiFilterActive,
  matchesVoucherTypeFilter,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  resolveVoucherTransactionTags,
  voucherMatchesBranchWarehouse,
} from "@/lib/accounts/trial-balance-voucher-tags";

export type DayBookVoucherType =
  | "sales_invoice"
  | "purchase_invoice"
  | "journal"
  | "receipt"
  | "payment"
  | "contra"
  | "credit_note"
  | "debit_note";

export type DayBookStatus = "posted";

export interface DayBookLedgerLine {
  id: string;
  ledgerId: number | null;
  ledgerName: string;
  particulars: string;
  narration: string;
  debit: number;
  credit: number;
  lineOrder: number;
  voucherId: number;
  generalLedgerHref: string;
}

export interface DayBookDrillDownContext {
  dateFrom?: string;
  dateTo?: string;
  financialYearId?: number | "all" | string;
  branch?: string | string[];
}

export interface DayBookTransactionRow {
  id: string;
  date: string;
  voucherNo: string;
  voucherType: DayBookVoucherType;
  voucherTypeLabel: string;
  ledgerPartyName: string;
  particulars: string;
  debit: number;
  credit: number;
  narration: string;
  ledgerId: number | null;
  viewHref: string;
  generalLedgerHref: string;
  isUnbalancedVoucher: boolean;
  voucherId: number;
  lineOrder: number;
  sourceId: number;
}

export type DayBookDisplayRowKind = "transaction" | "dateTotal";

export interface DayBookDisplayRow {
  kind: DayBookDisplayRowKind;
  id: string;
  date: string;
  voucherTypeLabel: string;
  voucherNo: string;
  ledgerPartyName: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  narration: string;
  ledgerId?: number | null;
  viewHref?: string;
  generalLedgerHref?: string;
  isUnbalancedVoucher?: boolean;
}

export interface DayBookVoucherGroup {
  id: string;
  voucherId: number;
  sourceId: number;
  date: string;
  voucherNo: string;
  voucherType: DayBookVoucherType;
  voucherTypeLabel: string;
  partyLedger: string;
  narration: string;
  lines: DayBookLedgerLine[];
  totalDebit: number;
  totalCredit: number;
  isUnbalanced: boolean;
  createdBy: string;
  status: DayBookStatus;
  branch: string;
  financialYearId: number | null;
  financialYearName: string;
  viewHref: string;
  createdAt: string;
}

export type DayBookExportRowKind = "transaction" | "dateTotal" | "grandTotal";

/** Flat row used for export and legacy integrations. */
export interface DayBookEntry {
  id: string;
  sourceId: number;
  date: string;
  voucherNo: string;
  voucherType: DayBookVoucherType;
  voucherTypeLabel: string;
  partyLedger: string;
  particulars: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  ledgerId: number | null;
  generalLedgerHref: string;
  isVoucherHeader: boolean;
  isUnbalancedVoucher: boolean;
  rowKind: DayBookExportRowKind;
  financialYearId: number | null;
  financialYearName: string;
  viewHref: string;
}

export const DAY_BOOK_VOUCHER_TYPE_OPTIONS: { value: DayBookVoucherType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "sales_invoice", label: "Sales Invoice" },
  { value: "purchase_invoice", label: "Purchase Invoice" },
  { value: "receipt", label: "Receipt Voucher" },
  { value: "payment", label: "Payment Voucher" },
  { value: "journal", label: "Journal Voucher" },
  { value: "contra", label: "Contra Voucher" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
];

export const DAY_BOOK_TYPE_LABELS: Record<DayBookVoucherType, string> = {
  sales_invoice: "Sales Invoice",
  purchase_invoice: "Purchase Invoice",
  journal: "Journal Voucher",
  receipt: "Receipt Voucher",
  payment: "Payment Voucher",
  contra: "Contra Voucher",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

const VOUCHER_TYPE_TO_DAY_BOOK: Record<VoucherTypeCode, DayBookVoucherType> = {
  sales: "sales_invoice",
  purchase: "purchase_invoice",
  journal: "journal",
  receipt: "receipt",
  payment: "payment",
  contra: "contra",
  credit_note: "credit_note",
  debit_note: "debit_note",
};

export type DayBookSortKey =
  | "date"
  | "voucherNo"
  | "voucherType"
  | "ledgerPartyName"
  | "particulars"
  | "narration"
  | "debit"
  | "credit";

export interface DayBookFilters {
  dateFrom?: string;
  dateTo?: string;
  voucherType?: DayBookVoucherType | "all" | string | string[];
  financialYearId?: number | "all" | string;
  branch?: string | string[];
}

export interface DayBookSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  voucherCount: number;
  lineCount: number;
  unbalancedVoucherCount: number;
}

export function formatDayBookDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** DD-MM-YYYY label for date total rows (client format). */
export function formatDayBookDateForTotal(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function buildGeneralLedgerHrefForDayBook(
  ledgerId: number,
  drillContext?: DayBookDrillDownContext,
): string {
  const branchValues = normalizeMultiFilter(drillContext?.branch);
  return buildGeneralLedgerHref({
    ledgerId,
    fromDate: drillContext?.dateFrom,
    toDate: drillContext?.dateTo,
    source: "day-book",
    branch: branchValues.length === 1 ? branchValues[0] : undefined,
    financialYearId:
      drillContext?.financialYearId != null && drillContext.financialYearId !== "all"
        ? String(drillContext.financialYearId)
        : undefined,
  });
}

function mapVoucherType(code: VoucherTypeCode): DayBookVoucherType {
  return VOUCHER_TYPE_TO_DAY_BOOK[code];
}

function resolveSourceId(v: AccountingVoucher): number {
  const ref = v.referenceNo?.trim() || "";
  switch (v.voucherType) {
    case "sales":
      return loadInvoices().find((i) => i.invoiceNo === ref)?.id ?? v.id;
    case "purchase":
      return loadPurchaseInvoices().find((i) => i.invoiceNo === ref)?.id ?? v.id;
    case "credit_note":
      return loadCreditNotes().find((n) => n.creditNoteNo === ref)?.id ?? v.id;
    case "debit_note":
      return loadDebitNotes().find((n) => n.debitNoteNo === ref)?.id ?? v.id;
    default:
      return v.id;
  }
}

function buildLedgerLines(v: AccountingVoucher): DayBookLedgerLine[] {
  const narration = v.narration?.trim() || "—";
  return v.lines
    .map((line, lineOrder) => ({ line, lineOrder }))
    .filter(({ line }) => roundMoney(line.debit) > 0 || roundMoney(line.credit) > 0)
    .map(({ line, lineOrder }) => {
      const debit = roundMoney(line.debit);
      const credit = roundMoney(line.credit);
      const ledgerId = line.ledgerId;
      let particulars = "—";
      try {
        if (ledgerId != null) {
          const contraNames = resolveContraLedgerNames(v, ledgerId, lineOrder, line);
          particulars = formatGlParticulars("transaction", debit, credit, contraNames);
        }
      } catch {
        particulars = narration;
      }
      return {
        id: `voucher-${v.id}-line-${line.id ?? lineOrder}`,
        ledgerId,
        ledgerName: line.ledgerName?.trim() || "—",
        particulars,
        narration: line.remarks?.trim() || narration,
        debit,
        credit,
        lineOrder,
        voucherId: v.id,
        generalLedgerHref: ledgerId
          ? buildGeneralLedgerHref({ ledgerId, source: "day-book" })
          : "/accounts/reports/general-ledger",
      };
    });
}

function resolvePartyLedger(v: AccountingVoucher, lines: DayBookLedgerLine[]): string {
  const debitLine = lines.find((l) => l.debit > 0);
  const creditLine = lines.find((l) => l.credit > 0);

  switch (v.voucherType) {
    case "sales":
    case "debit_note":
    case "payment":
      return debitLine?.ledgerName ?? creditLine?.ledgerName ?? "—";
    case "purchase":
    case "credit_note":
    case "receipt":
      return creditLine?.ledgerName ?? debitLine?.ledgerName ?? "—";
    default:
      return debitLine?.ledgerName ?? creditLine?.ledgerName ?? lines[0]?.ledgerName ?? "—";
  }
}

function voucherToDayBookGroup(v: AccountingVoucher): DayBookVoucherGroup | null {
  const lines = buildLedgerLines(v);
  if (lines.length === 0) return null;

  const totalDebit = roundMoney(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = roundMoney(lines.reduce((s, l) => s + l.credit, 0));
  const voucherType = mapVoucherType(v.voucherType);
  const tags = resolveVoucherTransactionTags(v);

  return {
    id: `voucher-${v.id}`,
    voucherId: v.id,
    sourceId: resolveSourceId(v),
    date: v.date,
    voucherNo: statementVoucherNo(v),
    voucherType,
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS[voucherType],
    partyLedger: resolvePartyLedger(v, lines),
    narration: v.narration?.trim() || "—",
    lines,
    totalDebit,
    totalCredit,
    isUnbalanced: totalDebit !== totalCredit,
    createdBy: v.createdBy ?? "—",
    status: "posted",
    branch: tags.branch || "—",
    financialYearId: v.financialYearId,
    financialYearName: v.financialYearName ?? "",
    viewHref: `/accounts/vouchers/view/${v.id}`,
    createdAt: v.date,
  };
}

/** Same voucher source as General Ledger / Trial Balance (posted + legacy approved). */
export function getDayBookSourceVouchers(): AccountingVoucher[] {
  return loadVouchers().filter((v) => isLedgerMovementVoucherStatus(v.status));
}

/** Branch values present on posted vouchers — for filter dropdowns. */
export function getDayBookBranchOptions(): string[] {
  const branches = new Set<string>();
  for (const voucher of getDayBookSourceVouchers()) {
    const tags = resolveVoucherTransactionTags(voucher);
    if (tags.branch?.trim()) branches.add(tags.branch.trim());
  }
  return [...branches].sort((a, b) => a.localeCompare(b));
}

export function countDayBookSourceVouchers(): number {
  return getDayBookSourceVouchers().length;
}

/** Day Book — all posted vouchers with full double-entry ledger lines. */
export function buildDayBookVoucherGroups(): DayBookVoucherGroup[] {
  const groups: DayBookVoucherGroup[] = [];
  for (const voucher of getDayBookSourceVouchers()) {
    try {
      const group = voucherToDayBookGroup(voucher);
      if (group) groups.push(group);
    } catch (err) {
      console.warn("[day-book] skipped voucher", voucher.id, err);
    }
  }
  return groups.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.voucherNo.localeCompare(b.voucherNo);
  });
}

/** @deprecated Use buildDayBookVoucherGroups — kept for callers expecting flat rows. */
export function buildDayBookEntries(): DayBookEntry[] {
  return flattenDayBookGroups(buildDayBookVoucherGroups());
}

export function flattenDayBookGroups(
  groups: DayBookVoucherGroup[],
  drillContext?: DayBookDrillDownContext,
): DayBookEntry[] {
  const transactions = flattenToDayBookTransactions(groups, drillContext);
  const summary = computeDayBookSummaryFromTransactions(transactions);
  return buildDayBookExportEntries(transactions, summary, groups);
}

export function flattenToDayBookTransactions(
  groups: DayBookVoucherGroup[],
  drillContext?: DayBookDrillDownContext,
): DayBookTransactionRow[] {
  const rows: DayBookTransactionRow[] = [];
  for (const group of groups) {
    for (const line of group.lines) {
      rows.push({
        id: line.id,
        date: group.date,
        voucherNo: group.voucherNo,
        voucherType: group.voucherType,
        voucherTypeLabel: group.voucherTypeLabel,
        ledgerPartyName: line.ledgerName,
        particulars: line.particulars,
        debit: line.debit,
        credit: line.credit,
        narration: line.narration,
        ledgerId: line.ledgerId,
        viewHref: group.viewHref,
        generalLedgerHref: line.ledgerId
          ? buildGeneralLedgerHrefForDayBook(line.ledgerId, drillContext)
          : "/accounts/reports/general-ledger",
        isUnbalancedVoucher: group.isUnbalanced,
        voucherId: group.voucherId,
        lineOrder: line.lineOrder,
        sourceId: group.sourceId,
      });
    }
  }
  return rows;
}

export function sortDayBookTransactionsChronologically(
  transactions: DayBookTransactionRow[],
): DayBookTransactionRow[] {
  return [...transactions].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const voucherCmp = a.voucherNo.localeCompare(b.voucherNo);
    if (voucherCmp !== 0) return voucherCmp;
    return a.lineOrder - b.lineOrder;
  });
}

export function buildDayBookDisplayRows(
  transactions: DayBookTransactionRow[],
): DayBookDisplayRow[] {
  const ordered = sortDayBookTransactionsChronologically(transactions);
  const result: DayBookDisplayRow[] = [];
  let signedRunning = 0;
  let currentDate = "";
  let dateDebit = 0;
  let dateCredit = 0;

  const flushDateTotal = () => {
    if (!currentDate) return;
    result.push({
      kind: "dateTotal",
      id: `date-total-${currentDate}`,
      date: currentDate,
      voucherTypeLabel: "",
      voucherNo: "",
      ledgerPartyName: "",
      particulars: "",
      debit: roundMoney(dateDebit),
      credit: roundMoney(dateCredit),
      runningBalance: 0,
      runningBalanceType: "Debit",
      narration: "",
    });
    dateDebit = 0;
    dateCredit = 0;
  };

  for (const txn of ordered) {
    if (currentDate && txn.date !== currentDate) {
      flushDateTotal();
    }
    currentDate = txn.date;

    signedRunning = applyMovement(signedRunning, txn.debit, txn.credit);
    const running = fromSignedBalance(signedRunning);
    dateDebit += txn.debit;
    dateCredit += txn.credit;

    result.push({
      kind: "transaction",
      id: txn.id,
      date: txn.date,
      voucherTypeLabel: txn.voucherTypeLabel,
      voucherNo: txn.voucherNo,
      ledgerPartyName: txn.ledgerPartyName,
      particulars: txn.particulars,
      debit: txn.debit,
      credit: txn.credit,
      runningBalance: running.amount,
      runningBalanceType: running.balanceType,
      narration: txn.narration,
      ledgerId: txn.ledgerId,
      viewHref: txn.viewHref,
      generalLedgerHref: txn.generalLedgerHref,
      isUnbalancedVoucher: txn.isUnbalancedVoucher,
    });
  }

  flushDateTotal();
  return result;
}

export function buildDayBookExportEntries(
  transactions: DayBookTransactionRow[],
  summary: DayBookSummary,
  groups: DayBookVoucherGroup[],
): DayBookEntry[] {
  const displayRows = buildDayBookDisplayRows(transactions);
  const txnById = new Map(transactions.map((t) => [t.id, t]));
  const meta = groups[0];

  const entries: DayBookEntry[] = displayRows.map((row) => {
    const txn = row.kind === "transaction" ? txnById.get(row.id) : undefined;
    return {
      id: row.id,
      sourceId: txn?.sourceId ?? 0,
      date: row.date,
      voucherNo: row.voucherNo,
      voucherType: txn?.voucherType ?? "journal",
      voucherTypeLabel: row.voucherTypeLabel,
      partyLedger: row.ledgerPartyName,
      particulars: row.particulars,
      narration: row.narration,
      debit: row.debit,
      credit: row.credit,
      runningBalance: row.runningBalance,
      runningBalanceType: row.runningBalanceType,
      ledgerId: row.ledgerId ?? null,
      generalLedgerHref: row.generalLedgerHref ?? "/accounts/reports/general-ledger",
      isVoucherHeader: false,
      isUnbalancedVoucher: row.isUnbalancedVoucher ?? false,
      rowKind: row.kind === "dateTotal" ? "dateTotal" : "transaction",
      financialYearId: meta?.financialYearId ?? null,
      financialYearName: meta?.financialYearName ?? "",
      viewHref: row.viewHref ?? "",
    };
  });

  entries.push({
    id: "grand-total",
    sourceId: 0,
    date: "",
    voucherNo: "",
    voucherType: "journal",
    voucherTypeLabel: "",
    partyLedger: "",
    particulars: "",
    narration: "",
    debit: summary.totalDebit,
    credit: summary.totalCredit,
    runningBalance: 0,
    runningBalanceType: "Debit",
    ledgerId: null,
    generalLedgerHref: "/accounts/reports/general-ledger",
    isVoucherHeader: false,
    isUnbalancedVoucher: false,
    rowKind: "grandTotal",
    financialYearId: meta?.financialYearId ?? null,
    financialYearName: meta?.financialYearName ?? "",
    viewHref: "",
  });

  return entries;
}

function voucherMatchesFinancialYearFilter(
  group: DayBookVoucherGroup,
  financialYearId: DayBookFilters["financialYearId"],
): boolean {
  if (!financialYearId || financialYearId === "all") return true;
  const fyId = Number(financialYearId);
  if (Number.isNaN(fyId)) return true;

  if (group.financialYearId != null) {
    return group.financialYearId === fyId;
  }

  const fy = loadFinancialYears().find((f) => f.id === fyId);
  if (!fy) return true;
  return group.date >= fy.startDate && group.date <= fy.endDate;
}

export function filterDayBookVoucherGroups(
  groups: DayBookVoucherGroup[],
  filters: DayBookFilters,
): DayBookVoucherGroup[] {
  const branchActive = isMultiFilterActive(filters.branch);
  const voucherById = branchActive
    ? new Map(getDayBookSourceVouchers().map((v) => [v.id, v]))
    : null;

  return groups.filter((g) => {
    if (filters.dateFrom && g.date < filters.dateFrom) return false;
    if (filters.dateTo && g.date > filters.dateTo) return false;
    if (!matchesVoucherTypeFilter(filters.voucherType, g.voucherType)) return false;
    if (!voucherMatchesFinancialYearFilter(g, filters.financialYearId)) return false;
    if (branchActive && voucherById) {
      const voucher = voucherById.get(g.voucherId);
      if (voucher && !voucherMatchesBranchWarehouse(voucher, filters.branch ?? [], [])) {
        return false;
      }
    }
    return true;
  });
}

/** @deprecated Use filterDayBookVoucherGroups */
export function filterDayBookEntries(
  entries: DayBookEntry[],
  filters: DayBookFilters,
): DayBookEntry[] {
  return entries.filter((e) => {
    if (filters.dateFrom && e.date < filters.dateFrom) return false;
    if (filters.dateTo && e.date > filters.dateTo) return false;
    if (!matchesVoucherTypeFilter(filters.voucherType, e.voucherType)) return false;
    if (
      filters.financialYearId &&
      filters.financialYearId !== "all" &&
      e.financialYearId !== Number(filters.financialYearId)
    ) {
      return false;
    }
    return true;
  });
}

export function sortDayBookVoucherGroups(
  groups: DayBookVoucherGroup[],
  sortKey: DayBookSortKey,
  sortDir: "asc" | "desc",
): DayBookVoucherGroup[] {
  const sorted = [...groups].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherNo":
        cmp = a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherType":
        cmp = a.voucherTypeLabel.localeCompare(b.voucherTypeLabel);
        break;
      case "ledgerPartyName":
        cmp = a.partyLedger.localeCompare(b.partyLedger);
        break;
      case "particulars":
        cmp = a.narration.localeCompare(b.narration);
        break;
      case "narration":
        cmp = a.narration.localeCompare(b.narration);
        break;
      case "debit":
        cmp = a.totalDebit - b.totalDebit;
        break;
      case "credit":
        cmp = a.totalCredit - b.totalCredit;
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

/** @deprecated Use sortDayBookVoucherGroups */
export function sortDayBookEntries(
  entries: DayBookEntry[],
  sortKey: DayBookSortKey,
  sortDir: "asc" | "desc",
): DayBookEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherNo":
        cmp = a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherType":
        cmp = a.voucherTypeLabel.localeCompare(b.voucherTypeLabel);
        break;
      case "ledgerPartyName":
        cmp = a.partyLedger.localeCompare(b.partyLedger);
        break;
      case "particulars":
        cmp = a.particulars.localeCompare(b.particulars);
        break;
      case "narration":
        cmp = a.narration.localeCompare(b.narration);
        break;
      case "debit":
        cmp = a.debit - b.debit;
        break;
      case "credit":
        cmp = a.credit - b.credit;
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function computeDayBookSummaryFromTransactions(
  transactions: DayBookTransactionRow[],
): DayBookSummary {
  const voucherIds = new Set(transactions.map((t) => t.voucherId));
  const unbalancedVoucherCount = new Set(
    transactions.filter((t) => t.isUnbalancedVoucher).map((t) => t.voucherId),
  ).size;
  const totalDebit = roundMoney(transactions.reduce((s, t) => s + t.debit, 0));
  const totalCredit = roundMoney(transactions.reduce((s, t) => s + t.credit, 0));
  const difference = roundMoney(totalDebit - totalCredit);

  return {
    totalDebit,
    totalCredit,
    isBalanced: difference === 0,
    difference,
    voucherCount: voucherIds.size,
    lineCount: transactions.length,
    unbalancedVoucherCount,
  };
}

export function computeDayBookSummary(groups: DayBookVoucherGroup[]): DayBookSummary {
  const transactions = flattenToDayBookTransactions(groups);
  return computeDayBookSummaryFromTransactions(transactions);
}

export function getActiveFinancialYearId(): number | null {
  return loadFinancialYears().find((fy) => fy.status === "active")?.id ?? null;
}

/** Default FY + date range for Day Book — aligned with Trial Balance / General Ledger. */
export function defaultDayBookFyDateRange(ref = new Date()): {
  from: string;
  to: string;
  fyId: string;
} {
  ensureFinancialYearsCurrent(ref);
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = ref.toISOString().slice(0, 10);
  if (!fy) {
    return { from: demoFinancialYearStart(ref), to: today, fyId: "all" };
  }
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Default Day Book range — first day of current FY through today. */
export function defaultDayBookDateFrom(): string {
  return demoFinancialYearStart();
}

export const DAY_BOOK_DEMO_VOUCHER_PATTERN =
  /^(SI|PI|JV|RV|PV|CN|DN|CV)-\d{4}$/;

export function isDayBookDemoVoucherNo(voucherNo: string): boolean {
  return DAY_BOOK_DEMO_VOUCHER_PATTERN.test(voucherNo);
}
