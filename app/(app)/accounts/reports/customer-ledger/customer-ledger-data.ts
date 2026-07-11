import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Customer Ledger report — local data & statement builder.
 * Isolated to Accounts → Reports → Customer Ledger only.
 */

import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  getCustomersForTransactionDropdown,
  type Customer,
} from "@/app/(app)/masters/customers/customer-data";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";
import { matchesVoucherTypeFilter } from "@/lib/accounts/report-multi-filter-utils";
import {
  buildPartyLedgerMovements,
  ledgerOpeningBalance,
  resolveCustomerReceivableLedger,
} from "@/lib/accounts/party-ledger-statement";

export type CustomerLedgerRowKind = "opening" | "transaction" | "closing";

export interface CustomerLedgerCustomerOption {
  id: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
}

export interface CustomerLedgerRawTransaction {
  date: string;
  voucherNo: string;
  voucherTypeCode: VoucherTypeCode;
  voucherType: string;
  particular: string;
  narration: string;
  debit: number;
  credit: number;
}

export interface CustomerLedgerDisplayRow {
  kind: CustomerLedgerRowKind;
  date: string;
  voucherNo: string;
  voucherType: string;
  voucherTypeCode: VoucherTypeCode;
  particular: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  voucherHref: string | null;
}

export interface CustomerLedgerSummary {
  customerId: number;
  customerCode: string;
  customerName: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
}

export interface CustomerLedgerStatement {
  summary: CustomerLedgerSummary;
  transactionRows: CustomerLedgerDisplayRow[];
  displayRows: CustomerLedgerDisplayRow[];
  hasPeriodTransactions: boolean;
}

export interface CustomerLedgerFilters {
  dateFrom: string;
  dateTo: string;
  voucherType: string | string[];
  search: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const CUSTOMER_LEDGER_VOUCHER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "sales", label: "Sales Invoice" },
  { value: "receipt", label: "Receipt Voucher" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
  { value: "journal", label: "Journal Voucher" },
];

const OPENING_BALANCES: Record<number, { amount: number; balanceType: BalanceSide }> = {
  1: { amount: 50000, balanceType: "Debit" },
  1001: { amount: 28500, balanceType: "Debit" },
  6: { amount: 12000, balanceType: "Credit" },
};

/** 24 movements for Agro Solutions Pvt Ltd — Apr–Jun 2026. */
const AGRO_SOLUTIONS_TRANSACTIONS: CustomerLedgerRawTransaction[] = [
  { date: demoDateAt(0), voucherNo: "SI-0001", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Sales invoice raised — urea dispatch", debit: 25000, credit: 0 },
  { date: demoDateAt(1), voucherNo: "RV-0001", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "Payment received — NEFT", debit: 0, credit: 20000 },
  { date: demoDateAt(2), voucherNo: "CN-0001", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Sales Return", narration: "Sales return adjustment — damaged bags", debit: 0, credit: 5000 },
  { date: demoDateAt(3), voucherNo: "SI-0002", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "DAP bulk order — Kharif prep", debit: 35400, credit: 0 },
  { date: demoDateAt(4), voucherNo: "RV-0002", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "Cheque deposit against SI-0002", debit: 0, credit: 25000 },
  { date: demoDateAt(5), voucherNo: "JV-0001", voucherTypeCode: "journal", voucherType: "Journal Voucher", particular: "Interest on delayed payment", narration: "Debit note adjustment journal", debit: 3200, credit: 0 },
  { date: demoDateAt(6), voucherNo: "SI-0003", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Pesticide combo — field pack", debit: 18750, credit: 0 },
  { date: demoDateAt(7), voucherNo: "RV-0003", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "UPI collection — field counter", debit: 0, credit: 12000 },
  { date: demoDateAt(8), voucherNo: "CN-0002", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Sales Return", narration: "Rate difference credit", debit: 0, credit: 2750 },
  { date: demoDateAt(9), voucherNo: "SI-0004", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "NPK seasonal pack", debit: 42500, credit: 0 },
  { date: demoDateAt(10), voucherNo: "RV-0004", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "RTGS receipt against SI-0004", debit: 0, credit: 30000 },
  { date: demoDateAt(11), voucherNo: "JV-0002", voucherTypeCode: "journal", voucherType: "Journal Voucher", particular: "Round-off adjustment", narration: "Round-off on May settlement", debit: 0, credit: 50 },
  { date: demoDateAt(12), voucherNo: "SI-0005", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Seed distribution — hybrid paddy", debit: 23600, credit: 0 },
  { date: demoDateAt(13), voucherNo: "CN-0003", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Sales Return", narration: "Damaged bags return", debit: 0, credit: 4200 },
  { date: demoDateAt(14), voucherNo: "RV-0005", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "Cash deposit — collection drive", debit: 0, credit: 18000 },
  { date: demoDateAt(15), voucherNo: "DN-0001", voucherTypeCode: "debit_note", voucherType: "Debit Note", particular: "Freight charges", narration: "Freight debit note raised", debit: 1800, credit: 0 },
  { date: demoDateAt(16), voucherNo: "SI-0006", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Micronutrient kit", debit: 15800, credit: 0 },
  { date: demoDateAt(17), voucherNo: "RV-0006", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "Final settlement — May outstanding", debit: 0, credit: 22000 },
  { date: demoDateAt(18), voucherNo: "SI-0007", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Kharif pre-booking", debit: 52000, credit: 0 },
  { date: demoDateAt(19), voucherNo: "RV-0007", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "Advance receipt — kharif booking", debit: 0, credit: 25000 },
  { date: demoDateAt(20), voucherNo: "CN-0004", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Sales Return", narration: "Scheme discount credit", debit: 0, credit: 3500 },
  { date: demoDateAt(21), voucherNo: "SI-0008", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Herbicide stock dispatch", debit: 28900, credit: 0 },
  { date: demoDateAt(22), voucherNo: "JV-0003", voucherTypeCode: "journal", voucherType: "Journal Voucher", particular: "Write-off adjustment", narration: "Small balance write-off approved", debit: 0, credit: 150 },
  { date: demoDateAt(23), voucherNo: "RV-0008", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "Part payment against SI-0008", debit: 0, credit: 15000 },
];

const MAHARASHTRA_AGRI_TRANSACTIONS: CustomerLedgerRawTransaction[] = [
  { date: demoDateAt(24), voucherNo: "SI-0101", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Fertilizer dispatch — Vidarbha", debit: 18500, credit: 0 },
  { date: demoDateAt(25), voucherNo: "RV-0101", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "ICICI Bank", narration: "NEFT receipt", debit: 0, credit: 10000 },
  { date: demoDateAt(26), voucherNo: "SI-0102", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Seed order — soybean", debit: 22400, credit: 0 },
  { date: demoDateAt(27), voucherNo: "CN-0101", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Sales Return", narration: "Quality complaint credit", debit: 0, credit: 2400 },
  { date: demoDateAt(28), voucherNo: "RV-0102", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "ICICI Bank", narration: "Cheque collection", debit: 0, credit: 15000 },
  { date: demoDateAt(29), voucherNo: "DN-0101", voucherTypeCode: "debit_note", voucherType: "Debit Note", particular: "Late payment charges", narration: "Interest on overdue invoice", debit: 950, credit: 0 },
  { date: demoDateAt(30), voucherNo: "SI-0103", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Monsoon stock replenishment", debit: 31200, credit: 0 },
  { date: demoDateAt(31), voucherNo: "JV-0101", voucherTypeCode: "journal", voucherType: "Journal Voucher", particular: "Discount adjustment", narration: "Volume discount journal entry", debit: 0, credit: 1200 },
];

const SHIVNERI_TRANSACTIONS: CustomerLedgerRawTransaction[] = [
  { date: demoDateAt(32), voucherNo: "SI-0201", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Retail counter sale", debit: 9800, credit: 0 },
  { date: demoDateAt(33), voucherNo: "RV-0201", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "Cash in Hand", narration: "Cash receipt at depot", debit: 0, credit: 5000 },
  { date: demoDateAt(34), voucherNo: "CN-0201", voucherTypeCode: "credit_note", voucherType: "Credit Note", particular: "Sales Return", narration: "Expired stock return", debit: 0, credit: 1800 },
  { date: demoDateAt(35), voucherNo: "SI-0202", voucherTypeCode: "sales", voucherType: "Sales Invoice", particular: "Sales Account", narration: "Bio-fertilizer order", debit: 14200, credit: 0 },
  { date: demoDateAt(36), voucherNo: "RV-0202", voucherTypeCode: "receipt", voucherType: "Receipt Voucher", particular: "HDFC Bank", narration: "Bank transfer received", debit: 0, credit: 8000 },
];

const TRANSACTIONS_BY_CUSTOMER: Record<number, CustomerLedgerRawTransaction[]> = {
  1: AGRO_SOLUTIONS_TRANSACTIONS,
  1001: MAHARASHTRA_AGRI_TRANSACTIONS,
  6: SHIVNERI_TRANSACTIONS,
};

export function formatCustomerLedgerDate(iso: string): string {
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

function inferCustomerVoucherTypeCode(voucherType: string, voucherNo: string): VoucherTypeCode {
  const label = voucherType.toLowerCase();
  const ref = voucherNo.toUpperCase();
  if (label.includes("sales") || ref.startsWith("INV") || ref.startsWith("SI-")) return "sales";
  if (label.includes("receipt") || ref.startsWith("RV-")) return "receipt";
  if (label.includes("credit note") || ref.startsWith("CN-")) return "credit_note";
  if (label.includes("debit note") || ref.startsWith("DN-")) return "debit_note";
  return "journal";
}

function customerToOption(customer: Customer): CustomerLedgerCustomerOption {
  const ledger = resolveCustomerReceivableLedger(customer);
  const opening = ledgerOpeningBalance(ledger);
  return {
    id: String(customer.id),
    customerId: customer.id,
    customerCode: customer.customerCode,
    customerName: customer.customerName,
    gstin: customer.gstin || "—",
    pan: customer.pan || "—",
    openingBalance: opening.amount,
    openingBalanceType: opening.balanceType,
  };
}

export function getCustomerLedgerCustomers(): CustomerLedgerCustomerOption[] {
  return getCustomersForTransactionDropdown().map(customerToOption);
}

export function getCustomerLedgerCustomerById(id: string): CustomerLedgerCustomerOption | null {
  const customerId = Number(id);
  if (!Number.isFinite(customerId)) return null;
  const customer = getCustomersForTransactionDropdown().find((c) => c.id === customerId);
  return customer ? customerToOption(customer) : null;
}

export function resolveCustomerLedgerVoucherHref(
  voucherNo: string,
  voucherTypeCode: VoucherTypeCode,
): string | null {
  const ref = voucherNo.trim();
  if (!ref || ref === "OB" || ref === "—") return null;

  switch (voucherTypeCode) {
    case "sales": {
      const inv = loadInvoices().find((i) => i.invoiceNo === ref);
      return inv ? `/accounts/transactions/invoices/${inv.id}` : null;
    }
    case "credit_note": {
      const note = loadCreditNotes().find((n) => n.creditNoteNo === ref);
      return note ? `/accounts/transactions/credit-notes/${note.id}` : null;
    }
    case "debit_note": {
      const note = loadDebitNotes().find((n) => n.debitNoteNo === ref);
      return note ? `/accounts/transactions/debit-notes/${note.id}` : null;
    }
    case "receipt":
    case "journal": {
      const voucher = loadVouchers().find((v) => v.voucherNumber === ref);
      return voucher ? `/accounts/vouchers/view/${voucher.id}` : null;
    }
    default:
      return null;
  }
}

function matchesSearch(row: CustomerLedgerRawTransaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.voucherNo,
    row.particular,
    row.narration,
    row.voucherType,
    String(row.debit),
    String(row.credit),
  ].some((v) => v.toLowerCase().includes(q));
}

function computeOpeningAtDate(
  customer: CustomerLedgerCustomerOption,
  allTransactions: CustomerLedgerRawTransaction[],
  dateFrom: string,
): { amount: number; balanceType: BalanceSide } {
  let balance = { amount: customer.openingBalance, balanceType: customer.openingBalanceType };

  for (const tx of allTransactions) {
    if (tx.date >= dateFrom) break;
    balance = applyMovement(balance, tx.debit, tx.credit);
  }

  return balance;
}

export function buildCustomerLedgerStatement(
  customerId: string,
  filters: CustomerLedgerFilters,
): CustomerLedgerStatement | null {
  const customer = getCustomerLedgerCustomerById(customerId);
  if (!customer) return null;

  const masterCustomer = getCustomersForTransactionDropdown().find(
    (c) => c.id === customer.customerId,
  );
  const ledger = masterCustomer ? resolveCustomerReceivableLedger(masterCustomer) : null;
  const opening = ledgerOpeningBalance(ledger);

  const allTransactions = buildPartyLedgerMovements(ledger)
    .map(
      (m): CustomerLedgerRawTransaction => ({
        date: m.date,
        voucherNo: m.voucherNo,
        voucherTypeCode: inferCustomerVoucherTypeCode(m.voucherType, m.voucherNo),
        voucherType: m.voucherType,
        particular: m.particular,
        narration: m.narration,
        debit: m.debit,
        credit: m.credit,
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo));

  const customerWithOpening: CustomerLedgerCustomerOption = {
    ...customer,
    openingBalance: opening.amount,
    openingBalanceType: opening.balanceType,
  };

  const periodOpening = computeOpeningAtDate(customerWithOpening, allTransactions, filters.dateFrom);

  const periodTransactions = allTransactions.filter(
    (t) => t.date >= filters.dateFrom && t.date <= filters.dateTo,
  );

  const filteredTransactions = periodTransactions.filter((t) => {
    if (!matchesVoucherTypeFilter(filters.voucherType, t.voucherTypeCode)) return false;
    return matchesSearch(t, filters.search);
  });

  let running = { ...periodOpening };
  const movementViewHref = new Map(
    buildPartyLedgerMovements(ledger).map((m) => [
      `${m.date}|${m.voucherNo}|${m.debit}|${m.credit}`,
      m.viewHref,
    ]),
  );
  const transactionRows: CustomerLedgerDisplayRow[] = filteredTransactions.map((t) => {
    running = applyMovement(running, t.debit, t.credit);
    const hrefKey = `${t.date}|${t.voucherNo}|${t.debit}|${t.credit}`;
    return {
      kind: "transaction",
      date: formatCustomerLedgerDate(t.date),
      voucherNo: t.voucherNo,
      voucherType: t.voucherType,
      voucherTypeCode: t.voucherTypeCode,
      particular: t.particular,
      narration: t.narration,
      debit: t.debit,
      credit: t.credit,
      runningBalance: running.amount,
      runningBalanceType: running.balanceType,
      voucherHref:
        movementViewHref.get(hrefKey) ??
        resolveCustomerLedgerVoucherHref(t.voucherNo, t.voucherTypeCode),
    };
  });

  const periodMovement = periodTransactions.filter((t) => {
    if (!matchesVoucherTypeFilter(filters.voucherType, t.voucherTypeCode)) return false;
    return matchesSearch(t, filters.search);
  });

  const totalDebit = roundMoney(periodMovement.reduce((s, t) => s + t.debit, 0));
  const totalCredit = roundMoney(periodMovement.reduce((s, t) => s + t.credit, 0));

  let closing = { ...periodOpening };
  for (const t of periodTransactions) {
    closing = applyMovement(closing, t.debit, t.credit);
  }

  const openingRow: CustomerLedgerDisplayRow = {
    kind: "opening",
    date: formatCustomerLedgerDate(filters.dateFrom),
    voucherNo: "OB",
    voucherType: "Opening Balance",
    voucherTypeCode: "journal",
    particular: "—",
    narration: "Opening balance",
    debit: periodOpening.balanceType === "Debit" ? periodOpening.amount : 0,
    credit: periodOpening.balanceType === "Credit" ? periodOpening.amount : 0,
    runningBalance: periodOpening.amount,
    runningBalanceType: periodOpening.balanceType,
    voucherHref: null,
  };

  const closingRow: CustomerLedgerDisplayRow = {
    kind: "closing",
    date: formatCustomerLedgerDate(filters.dateTo),
    voucherNo: "—",
    voucherType: "Closing Balance",
    voucherTypeCode: "journal",
    particular: "—",
    narration: "Closing balance",
    debit: 0,
    credit: 0,
    runningBalance: closing.amount,
    runningBalanceType: closing.balanceType,
    voucherHref: null,
  };

  const displayRows = [openingRow, ...transactionRows, closingRow];

  return {
    summary: {
      customerId: customer.customerId,
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      gstin: customer.gstin,
      pan: customer.pan,
      openingBalance: periodOpening.amount,
      openingBalanceType: periodOpening.balanceType,
      totalDebit,
      totalCredit,
      closingBalance: closing.amount,
      closingBalanceType: closing.balanceType,
    },
    transactionRows,
    displayRows,
    hasPeriodTransactions: periodTransactions.length > 0,
  };
}
