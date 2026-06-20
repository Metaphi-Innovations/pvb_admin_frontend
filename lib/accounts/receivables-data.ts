/**
 * Receivables — derived from posted sales invoices, receipt vouchers,
 * credit notes, and customer ledgers (connected demo data flow).
 */

import {
  loadInvoices,
  saveInvoices,
  derivePaymentStatus,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadCustomers, type Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { findErpPartyLink } from "@/lib/accounts/erp-party-links";
import { syncCustomerLedger } from "@/lib/accounts/erp-accounting-mapping";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { formatMoney } from "@/lib/accounts/money-format";

// ── Types ────────────────────────────────────────────────────────────────────

export type ReceivableStatus = "unpaid" | "partially_paid" | "paid" | "overdue";
export type ReceiptAllocationStatus = "unallocated" | "partially_allocated" | "fully_allocated";
export type CollectionFollowUpStatus =
  | "pending"
  | "follow_up_due"
  | "promise_to_pay"
  | "partially_collected"
  | "collected"
  | "escalated";

export interface CustomerOutstandingRow {
  customerName: string;
  ledgerId: number;
  invoiceCount: number;
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
  lastTransactionDate: string;
  customerId: number;
  customerCode: string;
  territory: string;
  branch: string;
  totalInvoiceAmount: number;
  paidAmount: number;
  creditNoteAdjusted: number;
  overdueAmount: number;
  notDueAmount: number;
  lastInvoiceDate: string;
  lastReceiptDate: string;
  status: ReceivableStatus;
}

export interface CustomerInvoiceOutstandingRow {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  paidAmount: number;
  creditNote: number;
  outstanding: number;
  daysOverdue: number;
  status: ReceivableStatus;
  ageingBucket: string;
}

export interface CustomerOutstandingDetail {
  customer: Customer;
  ledgerId: number;
  openingBalance: number;
  totalSales: number;
  totalReceipts: number;
  creditNotes: number;
  debitNotes: number;
  currentOutstanding: number;
  invoices: CustomerInvoiceOutstandingRow[];
}

export interface AgeingBucket {
  label: string;
  daysMin: number;
  daysMax: number | null;
  amount: number;
}

export interface CustomerAgeingRow {
  customerId: number;
  customerName: string;
  customerCode: string;
  territory: string;
  salesExecutive: string;
  currentNotDue: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90Plus: number;
  totalOutstanding: number;
  oldestInvoiceDate: string;
}

export interface ReceiptAllocationLine {
  invoiceId: number;
  invoiceNo: string;
  amount: number;
}

export interface ReceiptAllocationRecord {
  voucherId: number;
  receiptNo: string;
  receiptDate: string;
  customerId: number;
  customerName: string;
  receiptAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  bankAccount: string;
  referenceNo: string;
  status: ReceiptAllocationStatus;
  lines: ReceiptAllocationLine[];
}

export interface CollectionFollowUp {
  id: number;
  followUpNo: string;
  customerId: number;
  customerName: string;
  invoiceId: number | null;
  invoiceNo: string;
  outstandingAmount: number;
  dueDate: string;
  followUpDate: string;
  assignedTo: string;
  contactPerson: string;
  phone: string;
  promiseToPayDate: string;
  promiseAmount: number;
  status: CollectionFollowUpStatus;
  remarks: string;
  nextFollowUpDate: string;
}

export interface CollectionFollowUpInput {
  customerId: number;
  invoiceId?: number | null;
  followUpDate: string;
  assignedTo: string;
  contactPerson?: string;
  phone?: string;
  promiseToPayDate?: string;
  promiseAmount?: number;
  status?: CollectionFollowUpStatus;
  remarks?: string;
  nextFollowUpDate?: string;
}

const ALLOCATION_KEY = "ds_accounts_receipt_allocations_v1";
const COLLECTION_KEY = "ds_accounts_collection_followups_v1";

const TODAY = () => new Date().toISOString().slice(0, 10);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function resolveCustomerLedgerId(customer: Customer): number {
  const link = findErpPartyLink("customer_master", customer.id);
  if (link?.ledgerId) return link.ledgerId;
  const ledger = syncCustomerLedger(customer);
  return ledger?.id ?? 0;
}

function getCustomerById(id: number): Customer | undefined {
  return loadCustomers().find((c) => c.id === id);
}

// ── Invoice helpers ──────────────────────────────────────────────────────────

export function getPostedSalesInvoices(): InvoiceRecord[] {
  return loadInvoices().filter((inv) => inv.invoiceStatus === "sent");
}

export function getInvoiceOutstanding(inv: InvoiceRecord): number {
  const credited = inv.amountCredited ?? 0;
  return Math.max(0, round2(inv.grandTotal - inv.amountReceived - credited));
}

export function getInvoiceReceivableStatus(
  inv: InvoiceRecord,
  asOfDate = TODAY(),
): ReceivableStatus {
  const outstanding = getInvoiceOutstanding(inv);
  if (outstanding <= 0.009) return "paid";
  const daysOverdue = daysBetween(inv.dueDate, asOfDate);
  if (daysOverdue > 0) {
    if (inv.amountReceived > 0.009) return "overdue";
    return inv.paymentStatus === "partially_paid" ? "overdue" : "overdue";
  }
  if (inv.amountReceived <= 0.009) return "unpaid";
  if (inv.amountReceived >= inv.grandTotal - (inv.amountCredited ?? 0) - 0.009) return "paid";
  return "partially_paid";
}

export function getAgeingBucketLabel(daysOverdue: number, asOfDate: string, dueDate: string): string {
  if (daysBetween(dueDate, asOfDate) <= 0) return "Current / Not Due";
  if (daysOverdue <= 30) return "0–30 Days";
  if (daysOverdue <= 60) return "31–60 Days";
  if (daysOverdue <= 90) return "61–90 Days";
  return "90+ Days";
}

function bucketKey(daysOverdue: number, asOfDate: string, dueDate: string): keyof Pick<
  CustomerAgeingRow,
  "currentNotDue" | "bucket0_30" | "bucket31_60" | "bucket61_90" | "bucket90Plus"
> {
  if (daysBetween(dueDate, asOfDate) <= 0) return "currentNotDue";
  if (daysOverdue <= 30) return "bucket0_30";
  if (daysOverdue <= 60) return "bucket31_60";
  if (daysOverdue <= 90) return "bucket61_90";
  return "bucket90Plus";
}

function customerStatusFromInvoices(
  invoices: InvoiceRecord[],
  asOfDate: string,
): ReceivableStatus {
  const open = invoices.filter((i) => getInvoiceOutstanding(i) > 0.009);
  if (open.length === 0) return "paid";
  if (open.some((i) => daysBetween(i.dueDate, asOfDate) > 0)) return "overdue";
  if (open.every((i) => i.amountReceived <= 0.009)) return "unpaid";
  return "partially_paid";
}

function lastReceiptDateForCustomer(customerId: number, customerName: string): string {
  const customer = getCustomerById(customerId);
  const ledgerId = customer ? resolveCustomerLedgerId(customer) : 0;
  const receipts = loadVouchers()
    .filter(
      (v) =>
        v.voucherType === "receipt" &&
        (v.status === "posted" || v.status === "approved") &&
        v.lines.some((l) => l.ledgerId === ledgerId || l.ledgerName === customerName),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return receipts[0]?.date ?? "—";
}

function buildInvoiceRow(inv: InvoiceRecord, asOfDate: string): CustomerInvoiceOutstandingRow {
  const outstanding = getInvoiceOutstanding(inv);
  const daysOverdue = Math.max(0, daysBetween(inv.dueDate, asOfDate));
  return {
    invoiceId: inv.id,
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    invoiceAmount: inv.grandTotal,
    paidAmount: inv.amountReceived,
    creditNote: inv.amountCredited ?? 0,
    outstanding,
    daysOverdue: outstanding > 0 ? daysOverdue : 0,
    status: getInvoiceReceivableStatus(inv, asOfDate),
    ageingBucket: getAgeingBucketLabel(daysOverdue, asOfDate, inv.dueDate),
  };
}

// ── Customer outstanding ─────────────────────────────────────────────────────

export function computeCustomerOutstanding(asOfDate = TODAY()): CustomerOutstandingRow[] {
  const customers = loadCustomers();
  const invoices = getPostedSalesInvoices();
  const byCustomer = new Map<number, InvoiceRecord[]>();

  for (const inv of invoices) {
    if (!inv.customerId) continue;
    const list = byCustomer.get(inv.customerId) ?? [];
    list.push(inv);
    byCustomer.set(inv.customerId, list);
  }

  const rows: CustomerOutstandingRow[] = [];

  for (const [customerId, custInvoices] of byCustomer) {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) continue;

    const totalInvoiceAmount = round2(custInvoices.reduce((s, i) => s + i.grandTotal, 0));
    const paidAmount = round2(custInvoices.reduce((s, i) => s + i.amountReceived, 0));
    const creditNoteAdjusted = round2(
      custInvoices.reduce((s, i) => s + (i.amountCredited ?? 0), 0),
    );
    const outstanding = round2(
      custInvoices.reduce((s, i) => s + getInvoiceOutstanding(i), 0),
    );

    let overdueAmount = 0;
    let notDueAmount = 0;
    for (const inv of custInvoices) {
      const out = getInvoiceOutstanding(inv);
      if (out <= 0.009) continue;
      if (daysBetween(inv.dueDate, asOfDate) > 0) overdueAmount += out;
      else notDueAmount += out;
    }
    overdueAmount = round2(overdueAmount);
    notDueAmount = round2(notDueAmount);

    const lastInvoiceDate =
      custInvoices.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0]?.invoiceDate ?? "—";

    const ledgerId = resolveCustomerLedgerId(customer);

    rows.push({
      customerName: customer.customerName,
      ledgerId,
      invoiceCount: custInvoices.length,
      totalDebit: totalInvoiceAmount,
      totalCredit: paidAmount + creditNoteAdjusted,
      outstanding,
      lastTransactionDate: lastInvoiceDate,
      customerId,
      customerCode: customer.customerCode,
      territory: customer.territoryName || customer.districtName || "—",
      branch: customer.branch || customer.stateName || "—",
      totalInvoiceAmount,
      paidAmount,
      creditNoteAdjusted,
      overdueAmount,
      notDueAmount,
      lastInvoiceDate,
      lastReceiptDate: lastReceiptDateForCustomer(customerId, customer.customerName),
      status: customerStatusFromInvoices(custInvoices, asOfDate),
    });
  }

  return rows
    .filter((r) => r.outstanding > 0.009 || r.invoiceCount > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function computeOutstandingSummary(asOfDate = TODAY()) {
  const rows = computeCustomerOutstanding(asOfDate).filter((r) => r.outstanding > 0.009);
  const partiallyPaidInvoices = getPostedSalesInvoices().filter(
    (i) => getInvoiceOutstanding(i) > 0.009 && i.amountReceived > 0.009,
  ).length;

  return {
    totalOutstanding: round2(rows.reduce((s, r) => s + r.outstanding, 0)),
    customersWithOutstanding: rows.filter((r) => r.outstanding > 0.009).length,
    overdueAmount: round2(rows.reduce((s, r) => s + r.overdueAmount, 0)),
    notDueAmount: round2(rows.reduce((s, r) => s + r.notDueAmount, 0)),
    partiallyPaidInvoices,
  };
}

export function getCustomerOutstandingDetail(
  customerId: number,
  asOfDate = TODAY(),
): CustomerOutstandingDetail | null {
  const customer = getCustomerById(customerId);
  if (!customer) return null;

  const invoices = getPostedSalesInvoices()
    .filter((i) => i.customerId === customerId)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

  const ledgerId = resolveCustomerLedgerId(customer);
  const ledger = loadChartOfAccounts().find((l) => l.id === ledgerId);
  const openingBalance = ledger?.openingBalance ?? 0;

  const totalSales = round2(invoices.reduce((s, i) => s + i.grandTotal, 0));
  const totalReceipts = round2(invoices.reduce((s, i) => s + i.amountReceived, 0));
  const creditNotes = round2(invoices.reduce((s, i) => s + (i.amountCredited ?? 0), 0));
  const currentOutstanding = round2(invoices.reduce((s, i) => s + getInvoiceOutstanding(i), 0));

  return {
    customer,
    ledgerId,
    openingBalance,
    totalSales,
    totalReceipts,
    creditNotes,
    debitNotes: 0,
    currentOutstanding,
    invoices: invoices.map((i) => buildInvoiceRow(i, asOfDate)),
  };
}

// ── Ageing ───────────────────────────────────────────────────────────────────

export function computeCustomerAgeing(asOfDate = TODAY()): AgeingBucket[] {
  const summary = computeAgeingSummary(asOfDate);
  return [
    { label: "0–30 Days", daysMin: 0, daysMax: 30, amount: summary.bucket0_30 },
    { label: "31–60 Days", daysMin: 31, daysMax: 60, amount: summary.bucket31_60 },
    { label: "61–90 Days", daysMin: 61, daysMax: 90, amount: summary.bucket61_90 },
    { label: "90+ Days", daysMin: 91, daysMax: null, amount: summary.bucket90Plus },
  ];
}

export function computeAgeingSummary(asOfDate = TODAY()) {
  const rows = computeCustomerAgeingRows(asOfDate);
  return {
    totalOutstanding: round2(rows.reduce((s, r) => s + r.totalOutstanding, 0)),
    currentNotDue: round2(rows.reduce((s, r) => s + r.currentNotDue, 0)),
    bucket0_30: round2(rows.reduce((s, r) => s + r.bucket0_30, 0)),
    bucket31_60: round2(rows.reduce((s, r) => s + r.bucket31_60, 0)),
    bucket61_90: round2(rows.reduce((s, r) => s + r.bucket61_90, 0)),
    bucket90Plus: round2(rows.reduce((s, r) => s + r.bucket90Plus, 0)),
  };
}

export interface AgeingFilters {
  customerId?: number;
  branch?: string;
  territory?: string;
  salesExecutive?: string;
}

export function computeCustomerAgeingRows(
  asOfDate = TODAY(),
  filters: AgeingFilters = {},
): CustomerAgeingRow[] {
  const customers = loadCustomers();
  const invoices = getPostedSalesInvoices().filter((i) => getInvoiceOutstanding(i) > 0.009);
  const map = new Map<number, CustomerAgeingRow>();

  for (const inv of invoices) {
    if (!inv.customerId) continue;
    const customer = customers.find((c) => c.id === inv.customerId);
    if (!customer) continue;

    if (filters.customerId && customer.id !== filters.customerId) continue;
    if (filters.branch && (customer.branch || customer.stateName || "—") !== filters.branch) continue;
    if (filters.territory && customer.territoryName !== filters.territory) continue;
    if (filters.salesExecutive && customer.salesManName !== filters.salesExecutive) continue;

    const outstanding = getInvoiceOutstanding(inv);
    const daysOverdue = Math.max(0, daysBetween(inv.dueDate, asOfDate));
    const key = bucketKey(daysOverdue, asOfDate, inv.dueDate);

    const row =
      map.get(customer.id) ??
      ({
        customerId: customer.id,
        customerName: customer.customerName,
        customerCode: customer.customerCode,
        territory: customer.territoryName || customer.districtName || "—",
        salesExecutive: customer.salesManName || inv.salesperson || "—",
        currentNotDue: 0,
        bucket0_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucket90Plus: 0,
        totalOutstanding: 0,
        oldestInvoiceDate: inv.invoiceDate,
      } satisfies CustomerAgeingRow);

    row[key] = round2(row[key] + outstanding);
    row.totalOutstanding = round2(row.totalOutstanding + outstanding);
    if (inv.invoiceDate < row.oldestInvoiceDate) row.oldestInvoiceDate = inv.invoiceDate;
    map.set(customer.id, row);
  }

  return Array.from(map.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
}

export function getCustomerInvoiceAgeing(customerId: number, asOfDate = TODAY()) {
  return getPostedSalesInvoices()
    .filter((i) => i.customerId === customerId && getInvoiceOutstanding(i) > 0.009)
    .map((i) => buildInvoiceRow(i, asOfDate));
}

// ── Receipt allocation storage ───────────────────────────────────────────────

interface AllocationStoreEntry {
  voucherId: number;
  lines: ReceiptAllocationLine[];
}

function loadAllocationStore(): AllocationStoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALLOCATION_KEY);
    return raw ? (JSON.parse(raw) as AllocationStoreEntry[]) : [];
  } catch {
    return [];
  }
}

function saveAllocationStore(entries: AllocationStoreEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALLOCATION_KEY, JSON.stringify(entries));
}

function receiptCustomerLine(v: AccountingVoucher): { ledgerId: number; name: string } | null {
  const line = v.lines.find((l) => (Number(l.credit) || 0) > 0);
  if (!line) return null;
  return { ledgerId: line.ledgerId ?? 0, name: line.ledgerName || line.contactName || "" };
}

function bankLineName(v: AccountingVoucher): string {
  const line = v.lines.find((l) => (Number(l.debit) || 0) > 0);
  return line?.ledgerName ?? "Bank / Cash";
}

function resolveCustomerFromReceipt(v: AccountingVoucher): Customer | undefined {
  const custLine = receiptCustomerLine(v);
  if (!custLine) return undefined;
  const customers = loadCustomers();
  return customers.find(
    (c) =>
      c.customerName.toLowerCase() === custLine.name.toLowerCase() ||
      resolveCustomerLedgerId(c) === custLine.ledgerId,
  );
}

function allocationStatus(receiptAmount: number, allocated: number): ReceiptAllocationStatus {
  if (allocated <= 0.009) return "unallocated";
  if (allocated >= receiptAmount - 0.009) return "fully_allocated";
  return "partially_allocated";
}

export function loadReceiptAllocationRecords(): ReceiptAllocationRecord[] {
  const store = loadAllocationStore();
  const vouchers = loadVouchers().filter(
    (v) =>
      v.voucherType === "receipt" && (v.status === "posted" || v.status === "approved"),
  );

  return vouchers
    .map((v) => {
      const customer = resolveCustomerFromReceipt(v);
      const entry = store.find((e) => e.voucherId === v.id);
      const lines = entry?.lines ?? [];
      const allocatedAmount = round2(lines.reduce((s, l) => s + l.amount, 0));
      const receiptAmount = round2(v.totalDebit || v.totalCredit);
      return {
        voucherId: v.id,
        receiptNo: v.voucherNumber,
        receiptDate: v.date,
        customerId: customer?.id ?? 0,
        customerName: customer?.customerName ?? receiptCustomerLine(v)?.name ?? "—",
        receiptAmount,
        allocatedAmount,
        unallocatedAmount: round2(Math.max(0, receiptAmount - allocatedAmount)),
        bankAccount: bankLineName(v),
        referenceNo: v.referenceNo || "—",
        status: allocationStatus(receiptAmount, allocatedAmount),
        lines,
      } satisfies ReceiptAllocationRecord;
    })
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
}

export function getReceiptAllocationByVoucherId(voucherId: number): ReceiptAllocationRecord | undefined {
  return loadReceiptAllocationRecords().find((r) => r.voucherId === voucherId);
}

export function computeReceiptAllocationSummary() {
  const rows = loadReceiptAllocationRecords();
  return {
    unallocatedReceipts: rows.filter((r) => r.status === "unallocated").length,
    partiallyAllocated: rows.filter((r) => r.status === "partially_allocated").length,
    fullyAllocated: rows.filter((r) => r.status === "fully_allocated").length,
    totalUnallocatedAmount: round2(rows.reduce((s, r) => s + r.unallocatedAmount, 0)),
  };
}

export function getOpenInvoicesForCustomer(customerId: number): CustomerInvoiceOutstandingRow[] {
  return getPostedSalesInvoices()
    .filter((i) => i.customerId === customerId && getInvoiceOutstanding(i) > 0.009)
    .map((i) => buildInvoiceRow(i, TODAY()));
}

export function applyReceiptAllocation(
  voucherId: number,
  allocations: Array<{ invoiceId: number; amount: number }>,
): string | null {
  const record = getReceiptAllocationByVoucherId(voucherId);
  if (!record) return "Receipt voucher not found.";
  if (!record.customerId) return "Customer could not be resolved for this receipt.";

  const totalNew = round2(allocations.reduce((s, a) => s + a.amount, 0));
  if (totalNew > record.receiptAmount + 0.009) {
    return "Total allocation cannot exceed receipt balance.";
  }

  const invoices = loadInvoices();
  const store = loadAllocationStore();
  const previous = store.find((e) => e.voucherId === voucherId);

  if (previous) {
    for (const line of previous.lines) {
      const idx = invoices.findIndex((i) => i.id === line.invoiceId);
      if (idx < 0) continue;
      const inv = invoices[idx];
      const newReceived = round2(Math.max(0, inv.amountReceived - line.amount));
      invoices[idx] = {
        ...inv,
        amountReceived: newReceived,
        balanceAmount: round2(inv.grandTotal - newReceived - (inv.amountCredited ?? 0)),
        paymentStatus: derivePaymentStatus(inv.grandTotal - (inv.amountCredited ?? 0), newReceived),
      };
    }
  }

  const lines: ReceiptAllocationLine[] = [];

  for (const alloc of allocations) {
    if (alloc.amount <= 0) continue;
    const inv = invoices.find((i) => i.id === alloc.invoiceId);
    if (!inv || inv.customerId !== record.customerId) {
      return "Invalid invoice selected for allocation.";
    }
    const outstanding = getInvoiceOutstanding(inv);
    if (alloc.amount > outstanding + 0.009) {
      return `Allocation for ${inv.invoiceNo} exceeds invoice outstanding (${formatMoney(outstanding)}).`;
    }
    lines.push({ invoiceId: inv.id, invoiceNo: inv.invoiceNo, amount: round2(alloc.amount) });
  }

  const nextStore = store.filter((e) => e.voucherId !== voucherId);
  nextStore.push({ voucherId, lines });
  saveAllocationStore(nextStore);

  for (const line of lines) {
    const idx = invoices.findIndex((i) => i.id === line.invoiceId);
    if (idx < 0) continue;
    const inv = invoices[idx];
    const newReceived = round2(inv.amountReceived + line.amount);
    invoices[idx] = {
      ...inv,
      amountReceived: newReceived,
      balanceAmount: round2(inv.grandTotal - newReceived - (inv.amountCredited ?? 0)),
      paymentStatus: derivePaymentStatus(inv.grandTotal - (inv.amountCredited ?? 0), newReceived),
      collections: [
        ...inv.collections.filter((c) => c.referenceNo !== record.receiptNo),
        {
          id: Date.now() + line.invoiceId,
          paymentDate: record.receiptDate,
          amount: line.amount,
          paymentMode: "NEFT",
          referenceNo: record.receiptNo,
          remarks: `Allocated from ${record.receiptNo}`,
          createdBy: "System",
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
  saveInvoices(invoices);
  return null;
}

export function seedReceiptAllocations(entries: AllocationStoreEntry[]): void {
  saveAllocationStore(entries);
}

// ── Collection follow-ups ────────────────────────────────────────────────────

export const COLLECTION_FOLLOWUP_SEED: CollectionFollowUp[] = [];

export function loadCollectionFollowUps(): CollectionFollowUp[] {
  if (typeof window === "undefined") return COLLECTION_FOLLOWUP_SEED;
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) {
      localStorage.setItem(COLLECTION_KEY, JSON.stringify(COLLECTION_FOLLOWUP_SEED));
      return COLLECTION_FOLLOWUP_SEED;
    }
    return JSON.parse(raw) as CollectionFollowUp[];
  } catch {
    return COLLECTION_FOLLOWUP_SEED;
  }
}

export function saveCollectionFollowUps(records: CollectionFollowUp[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(records));
}

export function seedCollectionFollowUps(records: CollectionFollowUp[]): void {
  saveCollectionFollowUps(records);
}

function nextFollowUpNo(existing: CollectionFollowUp[]): string {
  const nums = existing
    .map((r) => {
      const m = r.followUpNo.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `FU-${String(next).padStart(4, "0")}`;
}

export function computeCollectionSummary(asOfDate = TODAY()) {
  const records = loadCollectionFollowUps();
  const monthStart = asOfDate.slice(0, 7) + "-01";
  return {
    totalFollowUps: records.length,
    dueToday: records.filter((r) => r.nextFollowUpDate === asOfDate).length,
    overdueFollowUps: records.filter(
      (r) =>
        r.nextFollowUpDate &&
        r.nextFollowUpDate < asOfDate &&
        r.status !== "collected",
    ).length,
    promisedCollections: records.filter((r) => r.status === "promise_to_pay").length,
    collectedThisMonth: records.filter(
      (r) => r.status === "collected" && r.followUpDate >= monthStart,
    ).length,
  };
}

export function createCollectionFollowUp(input: CollectionFollowUpInput): string | null {
  const customer = getCustomerById(input.customerId);
  if (!customer) return "Customer is required.";

  let outstandingAmount = 0;
  let invoiceNo = "";
  let dueDate = "";

  if (input.invoiceId) {
    const inv = getPostedSalesInvoices().find((i) => i.id === input.invoiceId);
    if (!inv) return "Invoice not found.";
    outstandingAmount = getInvoiceOutstanding(inv);
    invoiceNo = inv.invoiceNo;
    dueDate = inv.dueDate;
  } else {
    outstandingAmount = round2(
      getPostedSalesInvoices()
        .filter((i) => i.customerId === input.customerId)
        .reduce((s, i) => s + getInvoiceOutstanding(i), 0),
    );
  }

  const status = input.status ?? "pending";
  if (
    (status === "pending" || status === "promise_to_pay") &&
    !input.nextFollowUpDate
  ) {
    return "Next follow-up date is required for Pending or Promise To Pay status.";
  }

  if (input.promiseAmount && input.promiseAmount > outstandingAmount + 0.009) {
    return "Promise amount cannot exceed outstanding amount.";
  }

  const list = loadCollectionFollowUps();
  const row: CollectionFollowUp = {
    id: list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1,
    followUpNo: nextFollowUpNo(list),
    customerId: customer.id,
    customerName: customer.customerName,
    invoiceId: input.invoiceId ?? null,
    invoiceNo,
    outstandingAmount,
    dueDate,
    followUpDate: input.followUpDate,
    assignedTo: input.assignedTo,
    contactPerson: input.contactPerson ?? "",
    phone: input.phone ?? customer.mobile,
    promiseToPayDate: input.promiseToPayDate ?? "",
    promiseAmount: input.promiseAmount ?? 0,
    status,
    remarks: input.remarks ?? "",
    nextFollowUpDate: input.nextFollowUpDate ?? "",
  };
  saveCollectionFollowUps([row, ...list]);
  return null;
}

export function updateCollectionFollowUp(
  id: number,
  input: Partial<CollectionFollowUpInput> & { status?: CollectionFollowUpStatus },
): string | null {
  const list = loadCollectionFollowUps();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return "Follow-up not found.";

  const current = list[idx];
  const status = input.status ?? current.status;
  const nextFollowUpDate = input.nextFollowUpDate ?? current.nextFollowUpDate;
  const promiseAmount = input.promiseAmount ?? current.promiseAmount;

  if ((status === "pending" || status === "promise_to_pay") && !nextFollowUpDate) {
    return "Next follow-up date is required for Pending or Promise To Pay status.";
  }
  if (promiseAmount > current.outstandingAmount + 0.009) {
    return "Promise amount cannot exceed outstanding amount.";
  }

  list[idx] = {
    ...current,
    followUpDate: input.followUpDate ?? current.followUpDate,
    assignedTo: input.assignedTo ?? current.assignedTo,
    contactPerson: input.contactPerson ?? current.contactPerson,
    phone: input.phone ?? current.phone,
    promiseToPayDate: input.promiseToPayDate ?? current.promiseToPayDate,
    promiseAmount,
    status,
    remarks: input.remarks ?? current.remarks,
    nextFollowUpDate,
    invoiceId: input.invoiceId !== undefined ? input.invoiceId ?? null : current.invoiceId,
  };
  saveCollectionFollowUps(list);
  return null;
}

export function formatOutstanding(amount: number): string {
  return formatMoney(amount);
}

export function getAgeingFilterOptions() {
  const customers = loadCustomers();
  const territories = [...new Set(customers.map((c) => c.territoryName).filter(Boolean))];
  const executives = [...new Set(customers.map((c) => c.salesManName).filter(Boolean))];
  return { customers, territories, executives };
}
