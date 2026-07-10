/**
 * Receivables — derived from posted sales invoices, receipt vouchers,
 * credit notes, and customer ledgers (connected demo data flow).
 */

import {
  loadInvoices,
  saveInvoices,
  derivePaymentStatus,
  getInvoiceAmountBreakup,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadCustomers, type Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { tryAutoCreditNoteOnPayment } from "@/lib/accounts/credit-note-integration";
import { findErpPartyLink } from "@/lib/accounts/erp-party-links";
import { syncCustomerLedger } from "@/lib/accounts/erp-accounting-mapping";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { formatMoney } from "@/lib/accounts/money-format";
import { isPostedForReports } from "@/lib/accounts/accounts-maker-checker";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";

// ── Types ────────────────────────────────────────────────────────────────────

export type ReceivableStatus = "unpaid" | "partially_paid" | "paid" | "overdue";
export type ReceiptAllocationStatus = "unallocated" | "partially_allocated" | "fully_allocated";
export type CollectionFollowUpStatus =
  | "not_contacted"
  | "follow_up_scheduled"
  | "promise_to_pay"
  | "part_payment_received"
  | "escalated"
  | "closed";

/** @deprecated Legacy statuses — migrated on load */
type LegacyCollectionFollowUpStatus =
  | "pending"
  | "follow_up_due"
  | "partially_collected"
  | "collected";

export interface InvoiceOutstandingRow {
  invoiceId: number;
  customerId: number;
  customerName: string;
  customerCode: string;
  gstin: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  receivedAmount: number;
  outstandingAmount: number;
  overdueDays: number;
  status: ReceivableStatus;
}

export interface InvoiceOutstandingFilters {
  customerId?: number;
  status?: ReceivableStatus | "all";
  dateFrom?: string;
  dateTo?: string;
  financialYearId?: number;
  search?: string;
}

export interface InvoiceReceiptHistoryRow {
  receiptNo: string;
  receiptDate: string;
  amount: number;
  paymentMode: string;
  referenceNo: string;
}

export interface InvoiceOutstandingDetailView {
  customer: Customer;
  invoice: CustomerInvoiceOutstandingRow;
  receiptHistory: InvoiceReceiptHistoryRow[];
  summary: {
    invoiceAmount: number;
    receivedAmount: number;
    outstandingAmount: number;
  };
}

export interface CustomerReceiptAllocationSummary {
  customerId: number;
  customerName: string;
  customerCode: string;
  totalOutstanding: number;
  totalReceiptAvailable: number;
  unallocatedBalance: number;
  unallocatedReceipts: ReceiptAllocationRecord[];
}

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
  totalTaxableValue: number;
  totalGstAmount: number;
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
  taxableValue: number;
  gstAmount: number;
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
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket91_120: number;
  bucketAbove120: number;
  totalOutstanding: number;
  oldestInvoiceDate: string;
}

export interface CollectionFollowUpHistoryEntry {
  id: number;
  followUpId: number;
  date: string;
  status: CollectionFollowUpStatus;
  remarks: string;
  updatedBy: string;
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
const COLLECTION_HISTORY_KEY = "ds_accounts_collection_followup_history_v1";

const LEGACY_COLLECTION_STATUS_MAP: Record<LegacyCollectionFollowUpStatus, CollectionFollowUpStatus> = {
  pending: "not_contacted",
  follow_up_due: "follow_up_scheduled",
  partially_collected: "part_payment_received",
  collected: "closed",
};

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
  return loadInvoices().filter((inv) =>
    isPostedForReports(inv.workflow, inv.invoiceStatus),
  );
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
  if (daysBetween(dueDate, asOfDate) <= 0) return "0–30 Days";
  if (daysOverdue <= 30) return "0–30 Days";
  if (daysOverdue <= 60) return "31–60 Days";
  if (daysOverdue <= 90) return "61–90 Days";
  if (daysOverdue <= 120) return "91–120 Days";
  return "Above 120 Days";
}

function bucketKey(
  daysOverdue: number,
  asOfDate: string,
  dueDate: string,
): keyof Pick<
  CustomerAgeingRow,
  "bucket0_30" | "bucket31_60" | "bucket61_90" | "bucket91_120" | "bucketAbove120"
> {
  if (daysBetween(dueDate, asOfDate) <= 0 || daysOverdue <= 30) return "bucket0_30";
  if (daysOverdue <= 60) return "bucket31_60";
  if (daysOverdue <= 90) return "bucket61_90";
  if (daysOverdue <= 120) return "bucket91_120";
  return "bucketAbove120";
}

function invoiceMatchesFinancialYear(invoiceDate: string, fyId?: number): boolean {
  if (!fyId) return true;
  const fy = loadFinancialYears().find((y) => y.id === fyId);
  if (!fy) return true;
  return invoiceDate >= fy.startDate && invoiceDate <= fy.endDate;
}

export function getReceivableStatusLabel(status: ReceivableStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partially_paid":
      return "Partially Received";
    case "unpaid":
      return "Pending";
    case "overdue":
      return "Overdue";
    default:
      return status;
  }
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
  const { taxableValue, gstAmount, invoiceTotal } = getInvoiceAmountBreakup(inv);
  return {
    invoiceId: inv.id,
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    taxableValue,
    gstAmount,
    invoiceAmount: invoiceTotal,
    paidAmount: inv.amountReceived,
    creditNote: inv.amountCredited ?? 0,
    outstanding,
    daysOverdue: outstanding > 0 ? daysOverdue : 0,
    status: getInvoiceReceivableStatus(inv, asOfDate),
    ageingBucket: getAgeingBucketLabel(daysOverdue, asOfDate, inv.dueDate),
  };
}

// ── Invoice-level outstanding ─────────────────────────────────────────────────

export function computeInvoiceOutstanding(
  asOfDate = TODAY(),
  filters: InvoiceOutstandingFilters = {},
): InvoiceOutstandingRow[] {
  const customers = loadCustomers();
  const invoices = getPostedSalesInvoices();
  const q = filters.search?.trim().toLowerCase() ?? "";
  const rows: InvoiceOutstandingRow[] = [];

  for (const inv of invoices) {
    if (!inv.customerId) continue;
    const customer = customers.find((c) => c.id === inv.customerId);
    if (!customer) continue;

    if (filters.customerId && inv.customerId !== filters.customerId) continue;
    if (filters.dateFrom && inv.invoiceDate < filters.dateFrom) continue;
    if (filters.dateTo && inv.invoiceDate > filters.dateTo) continue;
    if (!invoiceMatchesFinancialYear(inv.invoiceDate, filters.financialYearId)) continue;

    const invoiceRow = buildInvoiceRow(inv, asOfDate);
    if (filters.status && filters.status !== "all" && invoiceRow.status !== filters.status) continue;

    if (q) {
      const hay = [
        customer.customerName,
        customer.customerCode,
        customer.gstin,
        inv.invoiceNo,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    rows.push({
      invoiceId: inv.id,
      customerId: customer.id,
      customerName: customer.customerName,
      customerCode: customer.customerCode,
      gstin: customer.gstin || "—",
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      invoiceAmount: invoiceRow.invoiceAmount,
      receivedAmount: invoiceRow.paidAmount,
      outstandingAmount: invoiceRow.outstanding,
      overdueDays: invoiceRow.daysOverdue,
      status: invoiceRow.status,
    });
  }

  return rows.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

export function getInvoiceReceiptHistory(invoiceId: number): InvoiceReceiptHistoryRow[] {
  const inv = getPostedSalesInvoices().find((i) => i.id === invoiceId);
  if (!inv) return [];

  const fromCollections: InvoiceReceiptHistoryRow[] = (inv.collections ?? []).map((c) => ({
    receiptNo: c.referenceNo || `RCPT-${c.id}`,
    receiptDate: c.paymentDate,
    amount: c.amount,
    paymentMode: c.paymentMode,
    referenceNo: c.referenceNo || "—",
  }));

  const allocationReceipts = loadReceiptAllocationRecords()
    .filter((r) => r.lines.some((l) => l.invoiceId === invoiceId))
    .flatMap((r) =>
      r.lines
        .filter((l) => l.invoiceId === invoiceId)
        .map((l) => ({
          receiptNo: r.receiptNo,
          receiptDate: r.receiptDate,
          amount: l.amount,
          paymentMode: "Receipt Voucher",
          referenceNo: r.referenceNo,
        })),
    );

  const merged = [...fromCollections, ...allocationReceipts];
  const seen = new Set<string>();
  return merged
    .filter((row) => {
      const key = `${row.receiptNo}-${row.amount}-${row.receiptDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
}

export function getInvoiceOutstandingDetail(
  invoiceId: number,
  asOfDate = TODAY(),
): InvoiceOutstandingDetailView | null {
  const inv = getPostedSalesInvoices().find((i) => i.id === invoiceId);
  if (!inv?.customerId) return null;
  const customer = getCustomerById(inv.customerId);
  if (!customer) return null;

  const invoice = buildInvoiceRow(inv, asOfDate);
  const receiptHistory = getInvoiceReceiptHistory(invoiceId);

  return {
    customer,
    invoice,
    receiptHistory,
    summary: {
      invoiceAmount: invoice.invoiceAmount,
      receivedAmount: invoice.paidAmount,
      outstandingAmount: invoice.outstanding,
    },
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

    const totalInvoiceAmount = round2(custInvoices.reduce((s, i) => s + getInvoiceAmountBreakup(i).invoiceTotal, 0));
    const totalTaxableValue = round2(custInvoices.reduce((s, i) => s + getInvoiceAmountBreakup(i).taxableValue, 0));
    const totalGstAmount = round2(custInvoices.reduce((s, i) => s + getInvoiceAmountBreakup(i).gstAmount, 0));
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
      totalTaxableValue,
      totalGstAmount,
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
    { label: "91–120 Days", daysMin: 91, daysMax: 120, amount: summary.bucket91_120 },
    { label: "Above 120 Days", daysMin: 121, daysMax: null, amount: summary.bucketAbove120 },
  ];
}

export function computeAgeingSummary(asOfDate = TODAY()) {
  const rows = computeCustomerAgeingRows(asOfDate);
  return {
    totalOutstanding: round2(rows.reduce((s, r) => s + r.totalOutstanding, 0)),
    bucket0_30: round2(rows.reduce((s, r) => s + r.bucket0_30, 0)),
    bucket31_60: round2(rows.reduce((s, r) => s + r.bucket31_60, 0)),
    bucket61_90: round2(rows.reduce((s, r) => s + r.bucket61_90, 0)),
    bucket91_120: round2(rows.reduce((s, r) => s + r.bucket91_120, 0)),
    bucketAbove120: round2(rows.reduce((s, r) => s + r.bucketAbove120, 0)),
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
        bucket0_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucket91_120: 0,
        bucketAbove120: 0,
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

function buildReceiptAllocationRecord(v: AccountingVoucher): ReceiptAllocationRecord | null {
  if (v.voucherType !== "receipt") return null;
  if (v.status !== "posted" && v.status !== "approved") return null;
  const customer = resolveCustomerFromReceipt(v);
  const entry = loadAllocationStore().find((e) => e.voucherId === v.id);
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
  };
}

function allocationStatus(receiptAmount: number, allocated: number): ReceiptAllocationStatus {
  if (allocated <= 0.009) return "unallocated";
  if (allocated >= receiptAmount - 0.009) return "fully_allocated";
  return "partially_allocated";
}

export function loadReceiptAllocationRecords(): ReceiptAllocationRecord[] {
  const vouchers = loadVouchers().filter(
    (v) =>
      v.voucherType === "receipt" && (v.status === "posted" || v.status === "approved"),
  );

  return vouchers
    .map((v) => buildReceiptAllocationRecord(v))
    .filter((r): r is ReceiptAllocationRecord => r != null)
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
  let record = getReceiptAllocationByVoucherId(voucherId);
  if (!record) {
    const voucher = loadVouchers().find((v) => v.id === voucherId);
    record = voucher ? buildReceiptAllocationRecord(voucher) ?? undefined : undefined;
  }
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

  for (const line of lines) {
    tryAutoCreditNoteOnPayment(line.invoiceId, record.receiptDate, line.amount);
  }

  return null;
}

export function seedReceiptAllocations(entries: AllocationStoreEntry[]): void {
  saveAllocationStore(entries);
}

export function getCustomerReceiptAllocationSummary(
  customerId: number,
): CustomerReceiptAllocationSummary | null {
  const customer = getCustomerById(customerId);
  if (!customer) return null;

  const totalOutstanding = round2(
    getPostedSalesInvoices()
      .filter((i) => i.customerId === customerId)
      .reduce((s, i) => s + getInvoiceOutstanding(i), 0),
  );

  const unallocatedReceipts = loadReceiptAllocationRecords().filter(
    (r) => r.customerId === customerId && r.unallocatedAmount > 0.009,
  );
  const unallocatedBalance = round2(
    unallocatedReceipts.reduce((s, r) => s + r.unallocatedAmount, 0),
  );
  const totalReceiptAvailable = round2(
    loadReceiptAllocationRecords()
      .filter((r) => r.customerId === customerId)
      .reduce((s, r) => s + r.receiptAmount, 0),
  );

  return {
    customerId: customer.id,
    customerName: customer.customerName,
    customerCode: customer.customerCode,
    totalOutstanding,
    totalReceiptAvailable,
    unallocatedBalance,
    unallocatedReceipts,
  };
}

export function applyCustomerReceiptAllocation(
  customerId: number,
  voucherId: number,
  allocations: Array<{ invoiceId: number; amount: number }>,
): string | null {
  const record = getReceiptAllocationByVoucherId(voucherId);
  if (!record || record.customerId !== customerId) {
    return "Selected receipt does not belong to this customer.";
  }
  return applyReceiptAllocation(voucherId, allocations);
}

function migrateCollectionStatus(status: string): CollectionFollowUpStatus {
  if (status in LEGACY_COLLECTION_STATUS_MAP) {
    return LEGACY_COLLECTION_STATUS_MAP[status as LegacyCollectionFollowUpStatus];
  }
  return status as CollectionFollowUpStatus;
}

function loadCollectionHistoryStore(): CollectionFollowUpHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COLLECTION_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as CollectionFollowUpHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveCollectionHistoryStore(entries: CollectionFollowUpHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COLLECTION_HISTORY_KEY, JSON.stringify(entries));
}

export function loadCollectionFollowUpHistory(followUpId: number): CollectionFollowUpHistoryEntry[] {
  return loadCollectionHistoryStore()
    .filter((e) => e.followUpId === followUpId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function appendCollectionHistory(
  followUpId: number,
  status: CollectionFollowUpStatus,
  remarks: string,
): void {
  const list = loadCollectionHistoryStore();
  const entry: CollectionFollowUpHistoryEntry = {
    id: list.length ? Math.max(...list.map((e) => e.id)) + 1 : 1,
    followUpId,
    date: TODAY(),
    status,
    remarks,
    updatedBy: "Admin",
  };
  saveCollectionHistoryStore([entry, ...list]);
}

export function seedCollectionFollowUpHistory(entries: CollectionFollowUpHistoryEntry[]): void {
  saveCollectionHistoryStore(entries);
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
    const parsed = JSON.parse(raw) as Array<CollectionFollowUp & { status: string }>;
    return parsed.map((row) => ({
      ...row,
      status: migrateCollectionStatus(row.status),
    }));
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
        r.status !== "closed",
    ).length,
    promisedCollections: records.filter((r) => r.status === "promise_to_pay").length,
    collectedThisMonth: records.filter(
      (r) => r.status === "closed" && r.followUpDate >= monthStart,
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

  const status = input.status ?? "not_contacted";
  if (
    (status === "not_contacted" ||
      status === "follow_up_scheduled" ||
      status === "promise_to_pay") &&
    !input.nextFollowUpDate
  ) {
    return "Next follow-up date is required for this status.";
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
  appendCollectionHistory(row.id, status, row.remarks || "Follow-up created");
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

  if (
    (status === "not_contacted" ||
      status === "follow_up_scheduled" ||
      status === "promise_to_pay") &&
    !nextFollowUpDate
  ) {
    return "Next follow-up date is required for this status.";
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
  if (status !== current.status || (input.remarks && input.remarks !== current.remarks)) {
    appendCollectionHistory(
      current.id,
      status,
      input.remarks ?? current.remarks ?? "Status updated",
    );
  }
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
