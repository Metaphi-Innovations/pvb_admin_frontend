import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Supplier Ledger report — local data & statement builder.
 * Isolated to Accounts → Reports → Supplier Ledger only.
 */

import { loadVendors, type Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import { getPurchaseInvoiceByNo } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";
import {
  buildPartyLedgerMovements,
  ledgerOpeningBalance,
  resolveVendorPayableLedger,
} from "@/lib/accounts/party-ledger-statement";

export type SupplierLedgerVoucherTypeCode =
  | "opening"
  | "purchase"
  | "payment"
  | "debit_note"
  | "credit_note"
  | "journal";

export interface SupplierLedgerSupplierOption {
  id: string;
  code: string;
  name: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
}

export interface SupplierLedgerRawTransaction {
  date: string;
  voucherNo: string;
  voucherTypeCode: SupplierLedgerVoucherTypeCode;
  voucherType: string;
  particular: string;
  narration: string;
  debit: number;
  credit: number;
  viewHref?: string;
}

export type SupplierLedgerRowKind = "opening" | "transaction" | "closing";

export interface SupplierLedgerDisplayRow {
  kind: SupplierLedgerRowKind;
  date: string;
  voucherNo: string;
  voucherType: string;
  voucherTypeCode: SupplierLedgerVoucherTypeCode;
  particular: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  viewHref?: string;
}

export interface SupplierLedgerSummary {
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  gstin: string;
  pan: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
}

export interface SupplierLedgerStatement {
  summary: SupplierLedgerSummary;
  transactionRows: SupplierLedgerDisplayRow[];
  displayRows: SupplierLedgerDisplayRow[];
  hasPeriodTransactions: boolean;
}

export interface SupplierLedgerFilters {
  dateFrom: string;
  dateTo: string;
  voucherType: string;
  search: string;
}

export const SUPPLIER_LEDGER_VOUCHER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "opening", label: "Opening Balance" },
  { value: "purchase", label: "Purchase Invoice" },
  { value: "payment", label: "Payment Voucher" },
  { value: "debit_note", label: "Debit Note" },
  { value: "credit_note", label: "Credit Note" },
  { value: "journal", label: "Journal Voucher" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatSupplierLedgerDate(iso: string): string {
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

const SUPPLIER_OPENING: Record<string, { openingBalance: number; openingBalanceType: BalanceSide }> = {
  "1": { openingBalance: 80000, openingBalanceType: "Credit" },
  "2": { openingBalance: 32500, openingBalanceType: "Credit" },
  "3": { openingBalance: 12000, openingBalanceType: "Credit" },
};

/** 24 realistic supplier movements — Agro Chem Distributors (vendor id 1). */
const AGRO_CHEM_TRANSACTIONS: SupplierLedgerRawTransaction[] = [
  {
    date: demoDateAt(0),
    voucherNo: "PI-0001",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "Purchase invoice booked",
    debit: 0,
    credit: 45000,
  },
  {
    date: demoDateAt(1),
    voucherNo: "PV-0001",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "HDFC Bank",
    narration: "Vendor payment made",
    debit: 30000,
    credit: 0,
  },
  {
    date: demoDateAt(2),
    voucherNo: "DN-0001",
    voucherTypeCode: "debit_note",
    voucherType: "Debit Note",
    particular: "Purchase Return",
    narration: "Purchase return adjustment",
    debit: 5000,
    credit: 0,
  },
  {
    date: demoDateAt(3),
    voucherNo: "PI-0002",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "Urea 50kg bags — Lot U-221",
    debit: 0,
    credit: 68500,
  },
  {
    date: demoDateAt(4),
    voucherNo: "PV-0002",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "HDFC Bank",
    narration: "RTGS payment against PI-0002",
    debit: 50000,
    credit: 0,
  },
  {
    date: demoDateAt(5),
    voucherNo: "CN-0001",
    voucherTypeCode: "credit_note",
    voucherType: "Credit Note",
    particular: "Purchase Account",
    narration: "Rate difference credit from supplier",
    debit: 0,
    credit: 2200,
  },
  {
    date: demoDateAt(6),
    voucherNo: "PI-0003",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "DAP fertilizer — Kharif season stock",
    debit: 0,
    credit: 92000,
  },
  {
    date: demoDateAt(7),
    voucherNo: "JV-0001",
    voucherTypeCode: "journal",
    voucherType: "Journal Voucher",
    particular: "Freight Charges",
    narration: "Freight allocation journal entry",
    debit: 0,
    credit: 3500,
  },
  {
    date: demoDateAt(8),
    voucherNo: "PV-0003",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "ICICI Bank",
    narration: "Cheque payment — partial settlement",
    debit: 40000,
    credit: 0,
  },
  {
    date: demoDateAt(9),
    voucherNo: "DN-0002",
    voucherTypeCode: "debit_note",
    voucherType: "Debit Note",
    particular: "Purchase Return",
    narration: "Damaged bags return — warehouse QC",
    debit: 8500,
    credit: 0,
  },
  {
    date: demoDateAt(10),
    voucherNo: "PI-0004",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "NPK blend — seasonal procurement",
    debit: 0,
    credit: 56800,
  },
  {
    date: demoDateAt(11),
    voucherNo: "PV-0004",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "HDFC Bank",
    narration: "NEFT vendor payment",
    debit: 35000,
    credit: 0,
  },
  {
    date: demoDateAt(12),
    voucherNo: "JV-0002",
    voucherTypeCode: "journal",
    voucherType: "Journal Voucher",
    particular: "TDS Payable",
    narration: "TDS deduction adjustment on payment",
    debit: 1800,
    credit: 0,
  },
  {
    date: demoDateAt(13),
    voucherNo: "PI-0005",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "Micronutrient mix — zinc sulphate",
    debit: 0,
    credit: 28400,
  },
  {
    date: demoDateAt(14),
    voucherNo: "CN-0002",
    voucherTypeCode: "credit_note",
    voucherType: "Credit Note",
    particular: "Purchase Account",
    narration: "Scheme discount credit note",
    debit: 0,
    credit: 4100,
  },
  {
    date: demoDateAt(15),
    voucherNo: "PV-0005",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "HDFC Bank",
    narration: "Month-end vendor settlement",
    debit: 55000,
    credit: 0,
  },
  {
    date: demoDateAt(16),
    voucherNo: "PI-0006",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "Herbicide stock — pre-monsoon",
    debit: 0,
    credit: 43200,
  },
  {
    date: demoDateAt(17),
    voucherNo: "DN-0003",
    voucherTypeCode: "debit_note",
    voucherType: "Debit Note",
    particular: "Purchase Return",
    narration: "Short supply quantity adjustment",
    debit: 3200,
    credit: 0,
  },
  {
    date: demoDateAt(18),
    voucherNo: "PV-0006",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "ICICI Bank",
    narration: "Advance payment against PI-0006",
    debit: 25000,
    credit: 0,
  },
  {
    date: demoDateAt(19),
    voucherNo: "JV-0003",
    voucherTypeCode: "journal",
    voucherType: "Journal Voucher",
    particular: "Round-off",
    narration: "Round-off on June settlement",
    debit: 0,
    credit: 75,
  },
  {
    date: demoDateAt(20),
    voucherNo: "PI-0007",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "Organic neem fertilizer — bulk order",
    debit: 0,
    credit: 37600,
  },
  {
    date: demoDateAt(21),
    voucherNo: "PV-0007",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "HDFC Bank",
    narration: "Final Q1 vendor payment",
    debit: 42000,
    credit: 0,
  },
  {
    date: demoDateAt(22),
    voucherNo: "CN-0003",
    voucherTypeCode: "credit_note",
    voucherType: "Credit Note",
    particular: "Purchase Account",
    narration: "Quality claim credit from supplier",
    debit: 0,
    credit: 2800,
  },
  {
    date: demoDateAt(23),
    voucherNo: "DN-0004",
    voucherTypeCode: "debit_note",
    voucherType: "Debit Note",
    particular: "Purchase Return",
    narration: "Expired stock return debit note",
    debit: 6400,
    credit: 0,
  },
];

const SEED_CORP_TRANSACTIONS: SupplierLedgerRawTransaction[] = [
  {
    date: demoDateAt(24),
    voucherNo: "PI-0101",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "Hybrid paddy seeds — 50kg packs",
    debit: 0,
    credit: 48000,
  },
  {
    date: demoDateAt(25),
    voucherNo: "PV-0101",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "HDFC Bank",
    narration: "Seed supplier advance payment",
    debit: 20000,
    credit: 0,
  },
  {
    date: demoDateAt(26),
    voucherNo: "PI-0102",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Purchase Account",
    narration: "Cotton seeds — Bt variety",
    debit: 0,
    credit: 36500,
  },
  {
    date: demoDateAt(27),
    voucherNo: "PV-0102",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "ICICI Bank",
    narration: "Seed Corp payment — May invoice",
    debit: 30000,
    credit: 0,
  },
  {
    date: demoDateAt(28),
    voucherNo: "DN-0101",
    voucherTypeCode: "debit_note",
    voucherType: "Debit Note",
    particular: "Purchase Return",
    narration: "Germination failure return",
    debit: 4500,
    credit: 0,
  },
  {
    date: demoDateAt(29),
    voucherNo: "JV-0101",
    voucherTypeCode: "journal",
    voucherType: "Journal Voucher",
    particular: "Freight Charges",
    narration: "Inbound freight allocation",
    debit: 0,
    credit: 1800,
  },
];

const SWIFT_LOGISTICS_TRANSACTIONS: SupplierLedgerRawTransaction[] = [
  {
    date: demoDateAt(30),
    voucherNo: "PI-0201",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Transport Charges",
    narration: "April warehouse dispatch freight",
    debit: 0,
    credit: 18500,
  },
  {
    date: demoDateAt(31),
    voucherNo: "PV-0201",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "HDFC Bank",
    narration: "Logistics vendor payment",
    debit: 15000,
    credit: 0,
  },
  {
    date: demoDateAt(32),
    voucherNo: "PI-0202",
    voucherTypeCode: "purchase",
    voucherType: "Purchase Invoice",
    particular: "Transport Charges",
    narration: "May field dispatch freight",
    debit: 0,
    credit: 22400,
  },
  {
    date: demoDateAt(33),
    voucherNo: "PV-0202",
    voucherTypeCode: "payment",
    voucherType: "Payment Voucher",
    particular: "ICICI Bank",
    narration: "Swift Logistics settlement",
    debit: 18000,
    credit: 0,
  },
];

const TRANSACTIONS_BY_SUPPLIER: Record<string, SupplierLedgerRawTransaction[]> = {
  "1": AGRO_CHEM_TRANSACTIONS,
  "2": SEED_CORP_TRANSACTIONS,
  "3": SWIFT_LOGISTICS_TRANSACTIONS,
};

function inferSupplierVoucherTypeCode(
  voucherType: string,
  voucherNo: string,
): SupplierLedgerVoucherTypeCode {
  const label = voucherType.toLowerCase();
  const ref = voucherNo.toUpperCase();
  if (label.includes("opening") || ref === "OB") return "opening";
  if (label.includes("purchase") || ref.startsWith("PUR-") || ref.startsWith("PI-")) return "purchase";
  if (label.includes("payment") || ref.startsWith("PV-")) return "payment";
  if (label.includes("debit note") || ref.startsWith("DN-")) return "debit_note";
  if (label.includes("credit note") || ref.startsWith("CN-")) return "credit_note";
  return "journal";
}

function vendorToOption(vendor: Vendor): SupplierLedgerSupplierOption {
  const ledger = resolveVendorPayableLedger(vendor);
  const opening = ledgerOpeningBalance(ledger);
  return {
    id: String(vendor.id),
    code: vendor.vendorCode,
    name: vendor.vendorName,
    gstin: vendor.gstNumber || "—",
    pan: vendor.panNumber || "—",
    openingBalance: opening.amount,
    openingBalanceType: opening.balanceType,
  };
}

export function getSupplierLedgerSuppliers(): SupplierLedgerSupplierOption[] {
  return loadVendors()
    .filter((v) => v.status === "active")
    .map(vendorToOption)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSupplierLedgerSupplierById(id: string): SupplierLedgerSupplierOption | null {
  return getSupplierLedgerSuppliers().find((s) => s.id === id) ?? null;
}

function matchesSearch(row: SupplierLedgerRawTransaction, query: string): boolean {
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
  supplier: SupplierLedgerSupplierOption,
  allTransactions: SupplierLedgerRawTransaction[],
  dateFrom: string,
): { amount: number; balanceType: BalanceSide } {
  let balance = { amount: supplier.openingBalance, balanceType: supplier.openingBalanceType };

  for (const tx of allTransactions) {
    if (tx.date >= dateFrom) break;
    balance = applyMovement(balance, tx.debit, tx.credit);
  }

  return balance;
}

function openingRowAmounts(opening: { amount: number; balanceType: BalanceSide }): {
  debit: number;
  credit: number;
} {
  if (opening.amount === 0) return { debit: 0, credit: 0 };
  if (opening.balanceType === "Debit") return { debit: opening.amount, credit: 0 };
  return { debit: 0, credit: opening.amount };
}

export function resolveSupplierLedgerVoucherHref(
  voucherNo: string,
  voucherTypeCode: SupplierLedgerVoucherTypeCode,
): string | null {
  if (!voucherNo || voucherNo === "OB") return null;

  switch (voucherTypeCode) {
    case "purchase": {
      const inv =
        getPurchaseInvoiceByNo(voucherNo) ??
        loadPurchaseInvoices().find((p) => p.invoiceNo === voucherNo);
      return inv ? `/accounts/purchase-invoices/${inv.id}` : null;
    }
    case "debit_note": {
      const note = loadDebitNotes().find(
        (n) => n.debitNoteNo === voucherNo || voucherNo.includes(n.debitNoteNo),
      );
      return note ? `/accounts/transactions/debit-notes/${note.id}` : null;
    }
    case "credit_note": {
      const note = loadCreditNotes().find(
        (n) => n.creditNoteNo === voucherNo || voucherNo.includes(n.creditNoteNo),
      );
      return note ? `/accounts/transactions/credit-notes/${note.id}` : null;
    }
    case "payment":
    case "journal": {
      const voucher = loadVouchers().find((v) => v.voucherNumber === voucherNo);
      return voucher ? `/accounts/vouchers/view/${voucher.id}` : null;
    }
    default:
      return null;
  }
}

export function buildSupplierLedgerStatement(
  supplierId: string,
  filters: SupplierLedgerFilters,
): SupplierLedgerStatement | null {
  const supplier = getSupplierLedgerSupplierById(supplierId);
  if (!supplier) return null;

  const masterVendor = loadVendors().find((v) => String(v.id) === supplierId);
  const ledger = masterVendor ? resolveVendorPayableLedger(masterVendor) : null;
  const opening = ledgerOpeningBalance(ledger);
  const partyMovements = buildPartyLedgerMovements(ledger);

  const allTransactions = partyMovements
    .map(
      (m): SupplierLedgerRawTransaction => ({
        date: m.date,
        voucherNo: m.voucherNo,
        voucherTypeCode: inferSupplierVoucherTypeCode(m.voucherType, m.voucherNo),
        voucherType: m.voucherType,
        particular: m.particular,
        narration: m.narration,
        debit: m.debit,
        credit: m.credit,
        viewHref: m.viewHref ?? undefined,
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo));

  const supplierWithOpening: SupplierLedgerSupplierOption = {
    ...supplier,
    openingBalance: opening.amount,
    openingBalanceType: opening.balanceType,
  };

  const periodOpening = computeOpeningAtDate(supplierWithOpening, allTransactions, filters.dateFrom);

  const periodTransactions = allTransactions.filter(
    (t) => t.date >= filters.dateFrom && t.date <= filters.dateTo,
  );

  const filteredTransactions = periodTransactions.filter((t) => {
    if (filters.voucherType !== "all" && t.voucherTypeCode !== filters.voucherType) return false;
    return matchesSearch(t, filters.search);
  });

  let running = { ...periodOpening };
  const transactionRows: SupplierLedgerDisplayRow[] = filteredTransactions.map((t) => {
    running = applyMovement(running, t.debit, t.credit);
    return {
      kind: "transaction",
      date: formatSupplierLedgerDate(t.date),
      voucherNo: t.voucherNo,
      voucherType: t.voucherType,
      voucherTypeCode: t.voucherTypeCode,
      particular: t.particular,
      narration: t.narration,
      debit: t.debit,
      credit: t.credit,
      runningBalance: running.amount,
      runningBalanceType: running.balanceType,
      viewHref:
        t.viewHref ??
        resolveSupplierLedgerVoucherHref(t.voucherNo, t.voucherTypeCode) ??
        undefined,
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

  const openingAmounts = openingRowAmounts(periodOpening);

  const openingRow: SupplierLedgerDisplayRow = {
    kind: "opening",
    date: formatSupplierLedgerDate(filters.dateFrom),
    voucherNo: "OB",
    voucherType: "Opening Balance",
    voucherTypeCode: "opening",
    particular: "—",
    narration: "Opening balance",
    debit: openingAmounts.debit,
    credit: openingAmounts.credit,
    runningBalance: periodOpening.amount,
    runningBalanceType: periodOpening.balanceType,
  };

  const closingRow: SupplierLedgerDisplayRow = {
    kind: "closing",
    date: formatSupplierLedgerDate(filters.dateTo),
    voucherNo: "—",
    voucherType: "—",
    voucherTypeCode: "opening",
    particular: "Closing Balance",
    narration: "Closing Balance",
    debit: totalDebit,
    credit: totalCredit,
    runningBalance: closing.amount,
    runningBalanceType: closing.balanceType,
  };

  const displayRows = [openingRow, ...transactionRows, closingRow];

  return {
    summary: {
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCode: supplier.code,
      gstin: supplier.gstin,
      pan: supplier.pan,
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
