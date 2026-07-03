import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Day Book demo seed — 18 balanced accounting vouchers (Jun 25–30 2026).
 * Idempotent via version key; replaces prior day-book demo records on upgrade.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadInvoices,
  saveInvoices,
  type InvoiceRecord,
  type InvoiceLineItem,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadPurchaseInvoices,
  savePurchaseInvoices,
  type PurchaseInvoiceRecord,
  type PurchaseInvoiceLine,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import {
  loadCreditNotes,
  saveCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  loadDebitNotes,
  saveDebitNotes,
  type DebitNoteRecord,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { DAY_BOOK_DEMO_VOUCHER_PATTERN } from "@/lib/accounts/day-book-data";

export const DAY_BOOK_DEMO_SEED_VERSION = "relative-dates-v1";
const VERSION_KEY = "ds_day_book_demo_seed_version";

const DEMO_ID_BASE = 9100;

function isDemoVoucherNo(no: string): boolean {
  return DAY_BOOK_DEMO_VOUCHER_PATTERN.test(no);
}

function cleanupDayBookDemoRecords(): void {
  saveInvoices(loadInvoices().filter((i) => !isDemoVoucherNo(i.invoiceNo)));
  savePurchaseInvoices(loadPurchaseInvoices().filter((i) => !isDemoVoucherNo(i.invoiceNo)));
  saveCreditNotes(loadCreditNotes().filter((c) => !isDemoVoucherNo(c.creditNoteNo)));
  saveDebitNotes(loadDebitNotes().filter((d) => !isDemoVoucherNo(d.debitNoteNo)));
  saveVouchers(loadVouchers().filter((v) => !isDemoVoucherNo(v.voucherNumber)));
}

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
}

function findBankLedger() {
  return getLedgersUnderSubGroupName("Bank Accounts")[0] ?? null;
}

function findExpenseLedger(namePart: string) {
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountType === "Expense" &&
        r.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function findPartyLedger(namePart: string) {
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function minimalSalesInvoice(spec: {
  id: number;
  invoiceNo: string;
  customerName: string;
  invoiceDate: string;
  time: string;
  grandTotal: number;
  status: "sent" | "draft";
  branch: string;
  remarks: string;
}): InvoiceRecord {
  const subtotal = Math.round((spec.grandTotal / 1.18) * 100) / 100;
  const taxAmount = Math.round((spec.grandTotal - subtotal) * 100) / 100;
  const line: InvoiceLineItem = {
    id: `si-line-${spec.id}`,
    productId: null,
    productName: "Agri Input",
    description: spec.remarks,
    qty: 10,
    unit: "Bag",
    unitPrice: subtotal / 10,
    discountPct: 0,
    taxPct: 18,
    amount: spec.grandTotal,
    creditedQty: 0,
    creditedAmount: 0,
  };

  return {
    id: spec.id,
    invoiceNo: spec.invoiceNo,
    invoiceDate: spec.invoiceDate,
    dueDate: spec.invoiceDate,
    referenceNo: spec.invoiceNo,
    remarks: spec.remarks,
    customerId: spec.id,
    customerName: spec.customerName,
    customerMobile: "",
    customerEmail: "",
    customerGst: "",
    billingAddress: "",
    lineItems: [line],
    subtotal,
    discountTotal: 0,
    taxAmount,
    grandTotal: spec.grandTotal,
    amountReceived: spec.status === "sent" ? spec.grandTotal : 0,
    balanceAmount: spec.status === "sent" ? 0 : spec.grandTotal,
    invoiceStatus: spec.status,
    paymentStatus: spec.status === "sent" ? "paid" : "unpaid",
    collections: [],
    attachments: [],
    activity: [],
    branch: spec.branch,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T${spec.time}:00.000Z`,
    updatedAt: `${spec.invoiceDate}T${spec.time}:00.000Z`,
  };
}

function minimalPurchaseInvoice(spec: {
  id: number;
  invoiceNo: string;
  vendorName: string;
  invoiceDate: string;
  time: string;
  grandTotal: number;
  remarks: string;
}): PurchaseInvoiceRecord {
  const subtotal = Math.round((spec.grandTotal / 1.18) * 100) / 100;
  const taxAmount = Math.round((spec.grandTotal - subtotal) * 100) / 100;
  const line: PurchaseInvoiceLine = {
    id: `pi-line-${spec.id}`,
    productId: null,
    productName: "Procurement Item",
    description: spec.remarks,
    invoiceQty: 20,
    unit: "Bag",
    unitPrice: subtotal / 20,
    taxPct: 0.18,
    lineAmount: subtotal,
    taxAmount,
    debitedQty: 0,
    debitedAmount: 0,
  };

  return {
    id: spec.id,
    invoiceNo: spec.invoiceNo,
    invoiceDate: spec.invoiceDate,
    vendorInvoiceNo: spec.invoiceNo,
    vendorId: spec.id,
    vendorName: spec.vendorName,
    vendorGst: "",
    poId: null,
    poNumber: "",
    poDate: "",
    grnId: null,
    grnNo: "",
    source: "manual_entry",
    lineItems: [line],
    additionalCharges: [],
    productAmount: subtotal,
    subtotal,
    taxAmount,
    grandTotal: spec.grandTotal,
    amountPaid: 0,
    amountDebited: 0,
    balanceDebitAllowed: spec.grandTotal,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    remarks: spec.remarks,
    attachment: null,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T${spec.time}:00.000Z`,
    updatedAt: `${spec.invoiceDate}T${spec.time}:00.000Z`,
  };
}

function minimalCreditNote(spec: {
  id: number;
  creditNoteNo: string;
  customerName: string;
  creditNoteDate: string;
  time: string;
  amount: number;
  remarks: string;
}): CreditNoteRecord {
  return {
    id: spec.id,
    creditNoteNo: spec.creditNoteNo,
    creditNoteDate: spec.creditNoteDate,
    againstType: "general",
    sourceInvoiceId: null,
    sourceInvoiceNo: "",
    sourceOrderId: null,
    sourceOrderNo: "",
    customerId: spec.id,
    customerName: spec.customerName,
    originalAmount: spec.amount,
    alreadyAdjustedAmount: 0,
    currentCreditAmount: spec.amount,
    balanceAfterAdjustment: 0,
    taxCreditAmount: 0,
    taxableValue: spec.amount,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    source: "manual",
    lineItems: [],
    reason: "Sales return",
    remarks: spec.remarks,
    status: "approved",
    activity: [],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.creditNoteDate}T${spec.time}:00.000Z`,
    updatedAt: `${spec.creditNoteDate}T${spec.time}:00.000Z`,
  };
}

function minimalDebitNote(spec: {
  id: number;
  debitNoteNo: string;
  vendorName: string;
  debitNoteDate: string;
  time: string;
  amount: number;
  remarks: string;
}): DebitNoteRecord {
  return {
    id: spec.id,
    debitNoteNo: spec.debitNoteNo,
    debitNoteDate: spec.debitNoteDate,
    againstType: "standalone_adjustment",
    sourceInvoiceId: null,
    sourceInvoiceNo: "",
    sourcePoId: null,
    sourcePoNo: "",
    sourceGrnNo: "",
    sourceQcNo: "",
    vendorId: spec.id,
    vendorName: spec.vendorName,
    originalAmount: spec.amount,
    alreadyAdjustedAmount: 0,
    taxableAmount: Math.round((spec.amount / 1.18) * 100) / 100,
    gstAmount: Math.round((spec.amount - spec.amount / 1.18) * 100) / 100,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: Math.round((spec.amount - spec.amount / 1.18) * 100) / 100,
    source: "manual",
    currentDebitAmount: spec.amount,
    balanceAfterAdjustment: 0,
    standaloneDebitAmount: spec.amount,
    lineItems: [],
    reason: "Rate difference",
    remarks: spec.remarks,
    attachments: [],
    status: "approved",
    activity: [],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.debitNoteDate}T${spec.time}:00.000Z`,
    updatedAt: `${spec.debitNoteDate}T${spec.time}:00.000Z`,
  };
}

function seedJournalVoucher(
  entries: Array<{ ledgerId: number; ledgerName: string; debit: number; credit: number }>,
  date: string,
  time: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("journal", {
    date,
    referenceNo: voucherNo,
    narration,
    status: "posted",
    lines: entries.map((e, i) => ({
      id: Date.now() + i + Math.random() * 1000,
      ledgerId: e.ledgerId,
      ledgerName: e.ledgerName,
      debit: e.debit,
      credit: e.credit,
      remarks: narration,
    })),
  });
  setVoucherNumber(v.id, voucherNo);
  const list = loadVouchers();
  const idx = list.findIndex((x) => x.id === v.id);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      createdBy: ACCOUNTS_CURRENT_USER,
    };
    saveVouchers(list);
  }
}

function seedReceiptVoucher(
  bankId: number,
  bankName: string,
  partyId: number,
  partyName: string,
  amount: number,
  date: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("receipt", {
    date,
    referenceNo: voucherNo,
    narration,
    status: "posted",
    lines: [
      { id: 1, ledgerId: bankId, ledgerName: bankName, debit: amount, credit: 0, remarks: narration },
      { id: 2, ledgerId: partyId, ledgerName: partyName, debit: 0, credit: amount, remarks: partyName },
    ],
  });
  setVoucherNumber(v.id, voucherNo);
}

function seedPaymentVoucher(
  bankId: number,
  bankName: string,
  partyId: number,
  partyName: string,
  amount: number,
  date: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("payment", {
    date,
    referenceNo: voucherNo,
    narration,
    status: "posted",
    lines: [
      { id: 1, ledgerId: partyId, ledgerName: partyName, debit: amount, credit: 0, remarks: partyName },
      { id: 2, ledgerId: bankId, ledgerName: bankName, debit: 0, credit: amount, remarks: narration },
    ],
  });
  setVoucherNumber(v.id, voucherNo);
}

function seedDayBookDocuments(): void {
  const invoices: InvoiceRecord[] = [
    minimalSalesInvoice({
      id: DEMO_ID_BASE + 1,
      invoiceNo: "SI-0001",
      customerName: "ABC Agro Distributor",
      invoiceDate: demoDateAt(0),
      time: "09:15",
      grandTotal: 115000,
      status: "sent",
      branch: "Head Office",
      remarks: "Tax invoice against dispatch",
    }),
    minimalSalesInvoice({
      id: DEMO_ID_BASE + 2,
      invoiceNo: "SI-0002",
      customerName: "Krishna Retail Store",
      invoiceDate: demoDateAt(1),
      time: "10:30",
      grandTotal: 48920,
      status: "sent",
      branch: "Branch",
      remarks: "Tax invoice against dispatch — retail counter",
    }),
    minimalSalesInvoice({
      id: DEMO_ID_BASE + 3,
      invoiceNo: "SI-0003",
      customerName: "Green Crop Solutions",
      invoiceDate: demoDateAt(2),
      time: "11:45",
      grandTotal: 76500,
      status: "sent",
      branch: "Field",
      remarks: "Tax invoice against dispatch — bulk order",
    }),
  ];
  saveInvoices([...loadInvoices().filter((i) => !isDemoVoucherNo(i.invoiceNo)), ...invoices]);

  const purchases: PurchaseInvoiceRecord[] = [
    minimalPurchaseInvoice({
      id: DEMO_ID_BASE + 11,
      invoiceNo: "PI-0001",
      vendorName: "Bharat Seeds",
      invoiceDate: demoDateAt(3),
      time: "14:20",
      grandTotal: 115000,
      remarks: "Purchase of pesticides",
    }),
    minimalPurchaseInvoice({
      id: DEMO_ID_BASE + 12,
      invoiceNo: "PI-0002",
      vendorName: "Pioneer Agro",
      invoiceDate: demoDateAt(4),
      time: "15:10",
      grandTotal: 48920,
      remarks: "Purchase of pesticides — replenishment stock",
    }),
    minimalPurchaseInvoice({
      id: DEMO_ID_BASE + 13,
      invoiceNo: "PI-0003",
      vendorName: "Shree Traders",
      invoiceDate: demoDateAt(5),
      time: "16:00",
      grandTotal: 35400,
      remarks: "Purchase of pesticides — seasonal procurement",
    }),
  ];
  savePurchaseInvoices([
    ...loadPurchaseInvoices().filter((p) => !isDemoVoucherNo(p.invoiceNo)),
    ...purchases,
  ]);

  const creditNotes: CreditNoteRecord[] = [
    minimalCreditNote({
      id: DEMO_ID_BASE + 21,
      creditNoteNo: "CN-0001",
      customerName: "ABC Agro Distributor",
      creditNoteDate: demoDateAt(6),
      time: "13:30",
      amount: 27500,
      remarks: "Sales return adjustment",
    }),
    minimalCreditNote({
      id: DEMO_ID_BASE + 22,
      creditNoteNo: "CN-0002",
      customerName: "Sunrise Agro",
      creditNoteDate: demoDateAt(7),
      time: "14:45",
      amount: 18750,
      remarks: "Sales return adjustment — damaged goods",
    }),
  ];
  saveCreditNotes([
    ...loadCreditNotes().filter((c) => !isDemoVoucherNo(c.creditNoteNo)),
    ...creditNotes,
  ]);

  const debitNotes: DebitNoteRecord[] = [
    minimalDebitNote({
      id: DEMO_ID_BASE + 31,
      debitNoteNo: "DN-0001",
      vendorName: "Bharat Seeds",
      debitNoteDate: "2026-06-28",
      time: "15:20",
      amount: 27500,
      remarks: "Purchase rate difference adjustment",
    }),
    minimalDebitNote({
      id: DEMO_ID_BASE + 32,
      debitNoteNo: "DN-0002",
      vendorName: "Kisan Agro Centre",
      debitNoteDate: "2026-06-29",
      time: "16:10",
      amount: 12500,
      remarks: "Purchase rate difference adjustment — short supply",
    }),
  ];
  saveDebitNotes([
    ...loadDebitNotes().filter((d) => !isDemoVoucherNo(d.debitNoteNo)),
    ...debitNotes,
  ]);
}

function seedDayBookVouchers(): void {
  const bank = findBankLedger();
  const expense = findExpenseLedger("Rent") ?? findExpenseLedger("Office");
  const freight = findExpenseLedger("Freight") ?? expense;
  const gst = findExpenseLedger("GST") ?? expense;
  const salary = findExpenseLedger("Salary") ?? expense;
  const inventory = findExpenseLedger("Inventory") ?? expense;
  const bankCharges = findExpenseLedger("Bank") ?? expense;
  const partyAbc = findPartyLedger("ABC") ?? bank;
  const partyKrishna = findPartyLedger("Krishna") ?? partyAbc;
  const partyMahadev = findPartyLedger("Mahadev") ?? partyAbc;
  const partyRamesh = findPartyLedger("Ramesh") ?? partyAbc;

  if (!bank || !expense) return;

  const ledgers = { bank, expense, freight, gst, salary, inventory, bankCharges };

  seedJournalVoucher(
    [
      { ledgerId: ledgers.gst!.id, ledgerName: ledgers.gst!.accountName, debit: 18750, credit: 0 },
      { ledgerId: bank.id, ledgerName: bank.accountName, debit: 0, credit: 18750 },
    ],
    "2026-06-25",
    "09:45",
    "JV-0001",
    "GST adjustment entry",
  );

  seedJournalVoucher(
    [
      { ledgerId: ledgers.salary!.id, ledgerName: ledgers.salary!.accountName, debit: 0, credit: 48920 },
      { ledgerId: bank.id, ledgerName: bank.accountName, debit: 48920, credit: 0 },
    ],
    "2026-06-29",
    "17:00",
    "JV-0002",
    "Salary provision",
  );

  seedJournalVoucher(
    [
      { ledgerId: ledgers.freight!.id, ledgerName: ledgers.freight!.accountName, debit: 236000, credit: 0 },
      { ledgerId: bank.id, ledgerName: bank.accountName, debit: 0, credit: 236000 },
    ],
    "2026-06-30",
    "10:00",
    "JV-0003",
    "Freight expense",
  );

  seedJournalVoucher(
    [
      { ledgerId: ledgers.inventory!.id, ledgerName: ledgers.inventory!.accountName, debit: 0, credit: 236000 },
      { ledgerId: bank.id, ledgerName: bank.accountName, debit: 236000, credit: 0 },
    ],
    "2026-06-30",
    "11:30",
    "JV-0004",
    "Inventory adjustment",
  );

  seedJournalVoucher(
    [
      { ledgerId: ledgers.bankCharges!.id, ledgerName: ledgers.bankCharges!.accountName, debit: 35400, credit: 0 },
      { ledgerId: bank.id, ledgerName: bank.accountName, debit: 0, credit: 35400 },
    ],
    "2026-06-30",
    "12:15",
    "JV-0005",
    "Bank charges",
  );

  seedJournalVoucher(
    [
      { ledgerId: ledgers.expense.id, ledgerName: ledgers.expense.accountName, debit: 0, credit: 12500 },
      { ledgerId: bank.id, ledgerName: bank.accountName, debit: 12500, credit: 0 },
    ],
    "2026-06-30",
    "13:00",
    "JV-0006",
    "Round-off adjustment",
  );

  seedReceiptVoucher(
    bank.id,
    bank.accountName,
    partyKrishna!.id,
    partyKrishna!.accountName,
    76500,
    "2026-06-26",
    "RV-0001",
    "Payment received through NEFT",
  );

  seedReceiptVoucher(
    bank.id,
    bank.accountName,
    partyAbc!.id,
    partyAbc!.accountName,
    18750,
    "2026-06-28",
    "RV-0002",
    "Payment received through NEFT — partial settlement",
  );

  seedPaymentVoucher(
    bank.id,
    bank.accountName,
    partyMahadev!.id,
    partyMahadev!.accountName,
    35400,
    "2026-06-25",
    "PV-0001",
    "Vendor payment through HDFC Bank",
  );

  seedPaymentVoucher(
    bank.id,
    bank.accountName,
    partyRamesh!.id,
    partyRamesh!.accountName,
    12500,
    "2026-06-29",
    "PV-0002",
    "Vendor payment through HDFC Bank — freight charges",
  );
}

export function seedDayBookDemoData(force = false): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(VERSION_KEY);
  if (!force && stored === DAY_BOOK_DEMO_SEED_VERSION) return;

  if (stored !== DAY_BOOK_DEMO_SEED_VERSION) {
    cleanupDayBookDemoRecords();
  }

  seedDayBookDocuments();
  seedDayBookVouchers();

  localStorage.setItem(VERSION_KEY, DAY_BOOK_DEMO_SEED_VERSION);
}

export function ensureDayBookDemoOnPageLoad(): void {
  seedDayBookDemoData();
}
