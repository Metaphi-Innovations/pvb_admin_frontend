/**
 * General Ledger report — local data & statement builder.
 * Isolated to Accounts → Reports → General Ledger only.
 */

import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";

export type GeneralLedgerLedgerType =
  | "Customer"
  | "Supplier"
  | "Bank"
  | "Expense"
  | "Income";

export interface GeneralLedgerLedgerOption {
  id: string;
  code: string;
  name: string;
  ledgerType: GeneralLedgerLedgerType;
  openingBalance: number;
  openingBalanceType: BalanceSide;
}

export interface GeneralLedgerRawTransaction {
  date: string;
  voucherNo: string;
  voucherTypeCode: VoucherTypeCode;
  voucherType: string;
  particular: string;
  narration: string;
  debit: number;
  credit: number;
}

export type GeneralLedgerRowKind = "opening" | "transaction" | "closing";

export interface GeneralLedgerDisplayRow {
  kind: GeneralLedgerRowKind;
  date: string;
  voucherNo: string;
  voucherType: string;
  particular: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
}

export interface GeneralLedgerSummary {
  ledgerId: string;
  ledgerName: string;
  ledgerCode: string;
  ledgerType: GeneralLedgerLedgerType;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
  currentBalance: number;
  currentBalanceType: BalanceSide;
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
  voucherType: string;
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

const LEDGER_OPTIONS: GeneralLedgerLedgerOption[] = [
  {
    id: "gl-abc-traders",
    code: "CUST-0042",
    name: "ABC Traders",
    ledgerType: "Customer",
    openingBalance: 50000,
    openingBalanceType: "Debit",
  },
  {
    id: "gl-hdfc-bank",
    code: "BANK-0001",
    name: "HDFC Bank — Current A/c",
    ledgerType: "Bank",
    openingBalance: 285000,
    openingBalanceType: "Debit",
  },
  {
    id: "gl-greenfield",
    code: "SUPP-0018",
    name: "GreenField Agro Suppliers",
    ledgerType: "Supplier",
    openingBalance: 42000,
    openingBalanceType: "Credit",
  },
  {
    id: "gl-fert-sales",
    code: "INC-0012",
    name: "Fertilizer Sales",
    ledgerType: "Income",
    openingBalance: 0,
    openingBalanceType: "Credit",
  },
  {
    id: "gl-office-rent",
    code: "EXP-0007",
    name: "Office Rent",
    ledgerType: "Expense",
    openingBalance: 0,
    openingBalanceType: "Debit",
  },
];

/** 25 posted movements for ABC Traders — Apr–Jun 2026 FY window. */
const ABC_TRADERS_TRANSACTIONS: GeneralLedgerRawTransaction[] = [
  { date: "2026-04-01", voucherNo: "OB", voucherTypeCode: "journal", voucherType: "Opening Balance", particular: "Opening Balance", narration: "Brought forward from previous FY", debit: 0, credit: 0 },
  { date: "2026-04-01", voucherNo: "SI-0001", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "Urea dispatch — Lot U-442", debit: 25000, credit: 0 },
  { date: "2026-04-05", voucherNo: "RV-0008", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "HDFC Bank — Current A/c", narration: "NEFT receipt — partial settlement", debit: 0, credit: 10000 },
  { date: "2026-04-10", voucherNo: "CN-0002", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Fertilizer Sales", narration: "Sales return — damaged bags", debit: 0, credit: 2000 },
  { date: "2026-04-12", voucherNo: "SI-0002", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "DAP bulk order — Kharif prep", debit: 35400, credit: 0 },
  { date: "2026-04-15", voucherNo: "RV-0012", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "HDFC Bank — Current A/c", narration: "Cheque deposit against SI-0002", debit: 0, credit: 25000 },
  { date: "2026-04-18", voucherNo: "JV-0004", voucherTypeCode: "journal", voucherType: "Journal", particular: "Interest on delayed payment", narration: "Debit note adjustment journal", debit: 3200, credit: 0 },
  { date: "2026-04-22", voucherNo: "SI-0003", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "Pesticide combo — field pack", debit: 18750, credit: 0 },
  { date: "2026-04-25", voucherNo: "PV-0006", voucherTypeCode: "payment", voucherType: "Payment", particular: "HDFC Bank — Current A/c", narration: "Advance adjusted against purchase", debit: 8500, credit: 0 },
  { date: "2026-04-28", voucherNo: "RV-0015", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "HDFC Bank — Current A/c", narration: "UPI collection — field counter", debit: 0, credit: 12000 },
  { date: "2026-05-02", voucherNo: "CN-0005", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Fertilizer Sales", narration: "Rate difference credit", debit: 0, credit: 2750 },
  { date: "2026-05-05", voucherNo: "SI-0004", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "NPK seasonal pack", debit: 42500, credit: 0 },
  { date: "2026-05-08", voucherNo: "RV-0018", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "HDFC Bank — Current A/c", narration: "RTGS receipt against SI-0004", debit: 0, credit: 30000 },
  { date: "2026-05-10", voucherNo: "JV-0007", voucherTypeCode: "journal", voucherType: "Journal", particular: "Round-off adjustment", narration: "Round-off on May settlement", debit: 0, credit: 50 },
  { date: "2026-05-12", voucherNo: "SI-0005", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "Seed distribution — hybrid paddy", debit: 23600, credit: 0 },
  { date: "2026-05-15", voucherNo: "CN-0006", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Fertilizer Sales", narration: "Damaged bags return", debit: 0, credit: 4200 },
  { date: "2026-05-18", voucherNo: "RV-0021", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "HDFC Bank — Current A/c", narration: "Cash deposit — collection drive", debit: 0, credit: 18000 },
  { date: "2026-05-20", voucherNo: "PV-0009", voucherTypeCode: "payment", voucherType: "Payment", particular: "HDFC Bank — Current A/c", narration: "Security deposit refund offset", debit: 6000, credit: 0 },
  { date: "2026-05-22", voucherNo: "SI-0006", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "Micronutrient kit", debit: 15800, credit: 0 },
  { date: "2026-05-25", voucherNo: "CT-0003", voucherTypeCode: "contra", voucherType: "Contra", particular: "HDFC Bank — Current A/c", narration: "Cash deposited to bank", debit: 0, credit: 15000 },
  { date: "2026-05-28", voucherNo: "RV-0024", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "HDFC Bank — Current A/c", narration: "Final settlement — May outstanding", debit: 0, credit: 22000 },
  { date: "2026-06-01", voucherNo: "SI-0007", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "Kharif pre-booking", debit: 52000, credit: 0 },
  { date: "2026-06-04", voucherNo: "RV-0027", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "HDFC Bank — Current A/c", narration: "Advance receipt — kharif booking", debit: 0, credit: 25000 },
  { date: "2026-06-08", voucherNo: "CN-0008", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Fertilizer Sales", narration: "Scheme discount credit", debit: 0, credit: 3500 },
  { date: "2026-06-12", voucherNo: "SI-0008", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Fertilizer Sales", narration: "Herbicide stock dispatch", debit: 28900, credit: 0 },
  { date: "2026-06-15", voucherNo: "PI-0004", voucherTypeCode: "purchase", voucherType: "Purchase Invoice", particular: "GreenField Agro Suppliers", narration: "Purchase invoice — advance adjustment", debit: 11800, credit: 0 },
  { date: "2026-06-18", voucherNo: "DN-0003", voucherTypeCode: "debit_note", voucherType: "Debit Note", particular: "GreenField Agro Suppliers", narration: "Vendor rate correction", debit: 5900, credit: 0 },
];

const HDFC_TRANSACTIONS: GeneralLedgerRawTransaction[] = [
  { date: "2026-04-08", voucherNo: "RV-0008", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "ABC Traders", narration: "NEFT receipt — partial settlement", debit: 10000, credit: 0 },
  { date: "2026-04-15", voucherNo: "RV-0012", voucherTypeCode: "receipt", voucherType: "Receipt", particular: "ABC Traders", narration: "Cheque deposit against SI-0002", debit: 25000, credit: 0 },
  { date: "2026-04-25", voucherNo: "PV-0006", voucherTypeCode: "payment", voucherType: "Payment", particular: "GreenField Agro Suppliers", narration: "Vendor payment — fertilizer stock", debit: 0, credit: 85000 },
  { date: "2026-05-25", voucherNo: "CT-0003", voucherTypeCode: "contra", voucherType: "Contra", particular: "Cash in Hand", narration: "Cash deposited to bank", debit: 15000, credit: 0 },
];

const TRANSACTIONS_BY_LEDGER: Record<string, GeneralLedgerRawTransaction[]> = {
  "gl-abc-traders": ABC_TRADERS_TRANSACTIONS,
  "gl-hdfc-bank": HDFC_TRANSACTIONS,
  "gl-greenfield": [
    { date: "2026-04-25", voucherNo: "PV-0006", voucherTypeCode: "payment", voucherType: "Payment", particular: "HDFC Bank — Current A/c", narration: "Vendor payment — fertilizer stock", debit: 0, credit: 85000 },
    { date: "2026-06-15", voucherNo: "PI-0004", voucherTypeCode: "purchase", voucherType: "Purchase Invoice", particular: "Fertilizer Purchase", narration: "Purchase invoice — urea lot", debit: 0, credit: 118000 },
    { date: "2026-06-18", voucherNo: "DN-0003", voucherTypeCode: "debit_note", voucherType: "Debit Note", particular: "ABC Traders", narration: "Rate correction debit note", debit: 5900, credit: 0 },
  ],
  "gl-fert-sales": ABC_TRADERS_TRANSACTIONS.filter((t) => t.voucherTypeCode === "sales" || t.voucherTypeCode === "credit_note").map((t) => ({
    ...t,
    debit: t.credit,
    credit: t.debit,
    particular: t.particular === "Fertilizer Sales" ? "ABC Traders" : t.particular,
  })),
  "gl-office-rent": [
    { date: "2026-04-05", voucherNo: "PV-0010", voucherTypeCode: "payment", voucherType: "Payment", particular: "HDFC Bank — Current A/c", narration: "April office rent", debit: 0, credit: 45000 },
    { date: "2026-05-05", voucherNo: "PV-0011", voucherTypeCode: "payment", voucherType: "Payment", particular: "HDFC Bank — Current A/c", narration: "May office rent", debit: 0, credit: 45000 },
    { date: "2026-06-05", voucherNo: "PV-0012", voucherTypeCode: "payment", voucherType: "Payment", particular: "HDFC Bank — Current A/c", narration: "June office rent", debit: 0, credit: 45000 },
  ],
};

export function getGeneralLedgerLedgers(): GeneralLedgerLedgerOption[] {
  return [...LEDGER_OPTIONS].sort((a, b) => a.name.localeCompare(b.name));
}

export function getGeneralLedgerLedgerById(id: string): GeneralLedgerLedgerOption | null {
  return LEDGER_OPTIONS.find((l) => l.id === id) ?? null;
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

function matchesSearch(row: GeneralLedgerRawTransaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.voucherNo, row.particular, row.narration, row.voucherType, String(row.debit), String(row.credit)].some(
    (v) => v.toLowerCase().includes(q),
  );
}

function computeOpeningAtDate(
  ledger: GeneralLedgerLedgerOption,
  allTransactions: GeneralLedgerRawTransaction[],
  dateFrom: string,
): { amount: number; balanceType: BalanceSide } {
  let balance = { amount: ledger.openingBalance, balanceType: ledger.openingBalanceType };

  for (const tx of allTransactions) {
    if (tx.date >= dateFrom) break;
    if (tx.voucherNo === "OB") continue;
    balance = applyMovement(balance, tx.debit, tx.credit);
  }

  return balance;
}

export function buildGeneralLedgerStatement(
  ledgerId: string,
  filters: GeneralLedgerFilters,
): GeneralLedgerStatement | null {
  const ledger = getGeneralLedgerLedgerById(ledgerId);
  if (!ledger) return null;

  const allTransactions = (TRANSACTIONS_BY_LEDGER[ledgerId] ?? [])
    .filter((t) => t.voucherNo !== "OB")
    .sort((a, b) => a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo));

  const periodOpening = computeOpeningAtDate(ledger, allTransactions, filters.dateFrom);

  const periodTransactions = allTransactions.filter(
    (t) => t.date >= filters.dateFrom && t.date <= filters.dateTo,
  );

  const filteredTransactions = periodTransactions.filter((t) => {
    if (filters.voucherType !== "all" && t.voucherTypeCode !== filters.voucherType) return false;
    return matchesSearch(t, filters.search);
  });

  let running = { ...periodOpening };
  const transactionRows: GeneralLedgerDisplayRow[] = filteredTransactions.map((t) => {
    running = applyMovement(running, t.debit, t.credit);
    return {
      kind: "transaction",
      date: formatGeneralLedgerDate(t.date),
      voucherNo: t.voucherNo,
      voucherType: t.voucherType,
      particular: t.particular,
      narration: t.narration,
      debit: t.debit,
      credit: t.credit,
      runningBalance: running.amount,
      runningBalanceType: running.balanceType,
    };
  });

  const periodMovement = periodTransactions.filter((t) => {
    if (filters.voucherType !== "all" && t.voucherTypeCode !== filters.voucherType) return false;
    return matchesSearch(t, filters.search);
  });

  const totalDebit = roundMoney(periodMovement.reduce((s, t) => s + t.debit, 0));
  const totalCredit = roundMoney(periodMovement.reduce((s, t) => s + t.credit, 0));

  let closing = { ...periodOpening };
  for (const t of periodTransactions) {
    closing = applyMovement(closing, t.debit, t.credit);
  }

  const openingRow: GeneralLedgerDisplayRow = {
    kind: "opening",
    date: formatGeneralLedgerDate(filters.dateFrom),
    voucherNo: "—",
    voucherType: "—",
    particular: "Opening Balance",
    narration: "Opening Balance",
    debit: 0,
    credit: 0,
    runningBalance: periodOpening.amount,
    runningBalanceType: periodOpening.balanceType,
  };

  const closingRow: GeneralLedgerDisplayRow = {
    kind: "closing",
    date: formatGeneralLedgerDate(filters.dateTo),
    voucherNo: "—",
    voucherType: "—",
    particular: "Closing Balance",
    narration: "Closing Balance",
    debit: 0,
    credit: 0,
    runningBalance: closing.amount,
    runningBalanceType: closing.balanceType,
  };

  const displayRows = [openingRow, ...transactionRows, closingRow];

  return {
    summary: {
      ledgerId: ledger.id,
      ledgerName: ledger.name,
      ledgerCode: ledger.code,
      ledgerType: ledger.ledgerType,
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
    displayRows,
    hasPeriodTransactions: periodTransactions.length > 0,
  };
}
