/**
 * Payables — derived from posted purchase invoices, payment vouchers,
 * debit notes, vendor credit notes, and vendor ledgers.
 */

import {
  loadPurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadVendors, type Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { findErpPartyLink } from "@/lib/accounts/erp-party-links";
import { syncVendorLedger } from "@/lib/accounts/erp-accounting-mapping";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { formatMoney } from "@/lib/accounts/money-format";

const VENDOR_META_KEY = "ds_accounts_payables_vendor_meta_v1";

export interface PayablesVendorMeta {
  territory: string;
  branch: string;
  purchaseManager: string;
}

export function getVendorPayablesMeta(vendorId: number): PayablesVendorMeta | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(VENDOR_META_KEY);
    const map = raw ? (JSON.parse(raw) as Record<number, PayablesVendorMeta>) : {};
    return map[vendorId];
  } catch {
    return undefined;
  }
}

export function saveVendorPayablesMeta(map: Record<number, PayablesVendorMeta>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VENDOR_META_KEY, JSON.stringify(map));
}

// ── Types ────────────────────────────────────────────────────────────────────

export type PayableStatus = "unpaid" | "partially_paid" | "paid" | "overdue";
export type PaymentAllocationStatus = "unallocated" | "partially_allocated" | "fully_allocated";

export interface VendorOutstandingRow {
  vendorName: string;
  ledgerId: number;
  billCount: number;
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
  lastTransactionDate: string;
  vendorId: number;
  vendorCode: string;
  gstin: string;
  territory: string;
  branch: string;
  totalPurchaseValue: number;
  paidAmount: number;
  debitNoteAdjusted: number;
  vendorCreditNotes: number;
  overdueAmount: number;
  notDueAmount: number;
  lastPurchaseDate: string;
  lastPaymentDate: string;
  status: PayableStatus;
}

export interface VendorBillOutstandingRow {
  billId: number;
  billNo: string;
  billDate: string;
  dueDate: string;
  billAmount: number;
  paidAmount: number;
  debitNoteAdjusted: number;
  outstanding: number;
  daysOverdue: number;
  status: PayableStatus;
  ageingBucket: string;
}

export interface VendorOutstandingDetail {
  vendor: Vendor;
  ledgerId: number;
  openingBalance: number;
  totalPurchases: number;
  totalPayments: number;
  debitNotes: number;
  creditNotes: number;
  currentOutstanding: number;
  bills: VendorBillOutstandingRow[];
}

export interface VendorAgeingRow {
  vendorId: number;
  vendorName: string;
  vendorCode: string;
  territory: string;
  purchaseManager: string;
  currentNotDue: number;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90Plus: number;
  totalOutstanding: number;
  oldestBillDate: string;
}

export interface PaymentAllocationLine {
  billId: number;
  billNo: string;
  amount: number;
}

export interface PaymentAllocationRecord {
  voucherId: number;
  paymentNo: string;
  paymentDate: string;
  vendorId: number;
  vendorName: string;
  paymentAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  bankAccount: string;
  referenceNo: string;
  status: PaymentAllocationStatus;
  lines: PaymentAllocationLine[];
}

export interface VendorCreditNoteRecord {
  id: number;
  creditNoteNo: string;
  creditNoteDate: string;
  vendorId: number;
  vendorName: string;
  sourceBillId: number | null;
  sourceBillNo: string;
  amount: number;
  reason: string;
  status: "approved" | "draft";
}

const PAYMENT_ALLOCATION_KEY = "ds_accounts_payment_allocations_v1";
const VENDOR_CREDIT_NOTE_KEY = "ds_accounts_vendor_credit_notes_v1";

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

export function getPurchaseDueDate(invoiceDate: string, vendor?: Vendor): string {
  const days = vendor
    ? parseInt(vendor.creditPeriodValue || "30", 10) || 30
    : 30;
  const d = new Date(invoiceDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function resolveVendorLedgerId(vendor: Vendor): number {
  const link = findErpPartyLink("vendor_master", vendor.id);
  if (link?.ledgerId) return link.ledgerId;
  const ledger = syncVendorLedger(vendor);
  return ledger?.id ?? 0;
}

function getVendorById(id: number): Vendor | undefined {
  return loadVendors().find((v) => v.id === id);
}

function vendorTerritory(vendor: Vendor): string {
  const meta = getVendorPayablesMeta(vendor.id);
  return meta?.territory ?? vendor.billingAddress?.state ?? "—";
}

function vendorBranch(vendor: Vendor): string {
  const meta = getVendorPayablesMeta(vendor.id);
  return meta?.branch ?? vendor.billingAddress?.city ?? "—";
}

// ── Supplier credit notes ──────────────────────────────────────────────────────

export function loadVendorCreditNotes(): VendorCreditNoteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VENDOR_CREDIT_NOTE_KEY);
    return raw ? (JSON.parse(raw) as VendorCreditNoteRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveVendorCreditNotes(records: VendorCreditNoteRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VENDOR_CREDIT_NOTE_KEY, JSON.stringify(records));
}

export function seedVendorCreditNotes(records: VendorCreditNoteRecord[]): void {
  saveVendorCreditNotes(records);
}

function vendorCreditNoteTotal(vendorId: number): number {
  return round2(
    loadVendorCreditNotes()
      .filter((n) => n.vendorId === vendorId && n.status === "approved")
      .reduce((s, n) => s + n.amount, 0),
  );
}

// ── Bill helpers ─────────────────────────────────────────────────────────────

export function getPostedPurchaseInvoices(): PurchaseInvoiceRecord[] {
  return loadPurchaseInvoices();
}

export function getBillOutstanding(bill: PurchaseInvoiceRecord): number {
  return Math.max(0, round2(bill.grandTotal - bill.amountPaid - bill.amountDebited));
}

export function getBillPayableStatus(
  bill: PurchaseInvoiceRecord,
  vendor?: Vendor,
  asOfDate = TODAY(),
): PayableStatus {
  const outstanding = getBillOutstanding(bill);
  if (outstanding <= 0.009) return "paid";
  const dueDate = getPurchaseDueDate(bill.invoiceDate, vendor);
  const daysOverdue = daysBetween(dueDate, asOfDate);
  if (daysOverdue > 0) return "overdue";
  if (bill.amountPaid <= 0.009) return "unpaid";
  return "partially_paid";
}

export function getAgeingBucketLabel(daysOverdue: number, asOfDate: string, dueDate: string): string {
  if (daysBetween(dueDate, asOfDate) <= 0) return "Current";
  if (daysOverdue <= 30) return "0–30 Days";
  if (daysOverdue <= 60) return "31–60 Days";
  if (daysOverdue <= 90) return "61–90 Days";
  return "90+ Days";
}

function bucketKey(
  daysOverdue: number,
  asOfDate: string,
  dueDate: string,
): keyof Pick<
  VendorAgeingRow,
  "currentNotDue" | "bucket0_30" | "bucket31_60" | "bucket61_90" | "bucket90Plus"
> {
  if (daysBetween(dueDate, asOfDate) <= 0) return "currentNotDue";
  if (daysOverdue <= 30) return "bucket0_30";
  if (daysOverdue <= 60) return "bucket31_60";
  if (daysOverdue <= 90) return "bucket61_90";
  return "bucket90Plus";
}

function vendorStatusFromBills(
  bills: PurchaseInvoiceRecord[],
  vendor: Vendor,
  asOfDate: string,
): PayableStatus {
  const open = bills.filter((b) => getBillOutstanding(b) > 0.009);
  if (open.length === 0) return "paid";
  if (open.some((b) => daysBetween(getPurchaseDueDate(b.invoiceDate, vendor), asOfDate) > 0)) {
    return "overdue";
  }
  if (open.every((b) => b.amountPaid <= 0.009)) return "unpaid";
  return "partially_paid";
}

function lastPaymentDateForVendor(vendorId: number, vendorName: string): string {
  const vendor = getVendorById(vendorId);
  const ledgerId = vendor ? resolveVendorLedgerId(vendor) : 0;
  const payments = loadVouchers()
    .filter(
      (v) =>
        v.voucherType === "payment" &&
        (v.status === "posted" || v.status === "approved") &&
        v.lines.some((l) => l.ledgerId === ledgerId || l.ledgerName === vendorName),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return payments[0]?.date ?? "—";
}

function buildBillRow(
  bill: PurchaseInvoiceRecord,
  vendor: Vendor,
  asOfDate: string,
): VendorBillOutstandingRow {
  const outstanding = getBillOutstanding(bill);
  const dueDate = getPurchaseDueDate(bill.invoiceDate, vendor);
  const daysOverdue = Math.max(0, daysBetween(dueDate, asOfDate));
  return {
    billId: bill.id,
    billNo: bill.invoiceNo,
    billDate: bill.invoiceDate,
    dueDate,
    billAmount: bill.grandTotal,
    paidAmount: bill.amountPaid,
    debitNoteAdjusted: bill.amountDebited,
    outstanding,
    daysOverdue: outstanding > 0 ? daysOverdue : 0,
    status: getBillPayableStatus(bill, vendor, asOfDate),
    ageingBucket: getAgeingBucketLabel(daysOverdue, asOfDate, dueDate),
  };
}

// ── Supplier outstanding ───────────────────────────────────────────────────────

export interface PayablesOutstandingFilters {
  vendorId?: number;
  branch?: string;
  territory?: string;
  status?: PayableStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

export function computeVendorOutstanding(
  asOfDate = TODAY(),
  filters: PayablesOutstandingFilters = {},
): VendorOutstandingRow[] {
  const vendors = loadVendors();
  const bills = getPostedPurchaseInvoices();
  const byVendor = new Map<number, PurchaseInvoiceRecord[]>();

  for (const bill of bills) {
    if (!bill.vendorId) continue;
    const list = byVendor.get(bill.vendorId) ?? [];
    list.push(bill);
    byVendor.set(bill.vendorId, list);
  }

  const rows: VendorOutstandingRow[] = [];

  for (const [vendorId, vendorBills] of byVendor) {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) continue;

    if (filters.vendorId && vendorId !== filters.vendorId) continue;
    const territory = vendorTerritory(vendor);
    const branch = vendorBranch(vendor);
    if (filters.territory && territory !== filters.territory) continue;
    if (filters.branch && branch !== filters.branch) continue;

    let filteredBills = vendorBills;
    if (filters.dateFrom) {
      filteredBills = filteredBills.filter((b) => b.invoiceDate >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filteredBills = filteredBills.filter((b) => b.invoiceDate <= filters.dateTo!);
    }

    const totalPurchaseValue = round2(filteredBills.reduce((s, b) => s + b.grandTotal, 0));
    const paidAmount = round2(filteredBills.reduce((s, b) => s + b.amountPaid, 0));
    const debitNoteAdjusted = round2(filteredBills.reduce((s, b) => s + b.amountDebited, 0));
    const vendorCreditNotes = vendorCreditNoteTotal(vendorId);
    const billOutstanding = round2(
      filteredBills.reduce((s, b) => s + getBillOutstanding(b), 0),
    );
    const outstanding = round2(billOutstanding + vendorCreditNotes);

    let overdueAmount = 0;
    let notDueAmount = 0;
    for (const bill of filteredBills) {
      const out = getBillOutstanding(bill);
      if (out <= 0.009) continue;
      const dueDate = getPurchaseDueDate(bill.invoiceDate, vendor);
      if (daysBetween(dueDate, asOfDate) > 0) overdueAmount += out;
      else notDueAmount += out;
    }
    overdueAmount = round2(overdueAmount);
    notDueAmount = round2(notDueAmount + vendorCreditNotes);

    const status = vendorStatusFromBills(filteredBills, vendor, asOfDate);
    if (filters.status && filters.status !== "all" && status !== filters.status) continue;

    const lastPurchaseDate =
      filteredBills.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0]?.invoiceDate ??
      "—";

    const ledgerId = resolveVendorLedgerId(vendor);

    rows.push({
      vendorName: vendor.vendorName,
      ledgerId,
      billCount: filteredBills.length,
      totalDebit: paidAmount + debitNoteAdjusted,
      totalCredit: totalPurchaseValue + vendorCreditNotes,
      outstanding,
      lastTransactionDate: lastPurchaseDate,
      vendorId,
      vendorCode: vendor.vendorCode,
      gstin: vendor.gstNumber || "—",
      territory,
      branch,
      totalPurchaseValue,
      paidAmount,
      debitNoteAdjusted,
      vendorCreditNotes,
      overdueAmount,
      notDueAmount,
      lastPurchaseDate,
      lastPaymentDate: lastPaymentDateForVendor(vendorId, vendor.vendorName),
      status,
    });
  }

  return rows
    .filter((r) => r.outstanding > 0.009 || r.billCount > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function computePayablesSummary(asOfDate = TODAY()) {
  const rows = computeVendorOutstanding(asOfDate).filter((r) => r.outstanding > 0.009);
  const partiallyPaidBills = getPostedPurchaseInvoices().filter(
    (b) => getBillOutstanding(b) > 0.009 && b.amountPaid > 0.009,
  ).length;

  return {
    totalPayables: round2(rows.reduce((s, r) => s + r.outstanding, 0)),
    vendorsWithOutstanding: rows.filter((r) => r.outstanding > 0.009).length,
    overduePayables: round2(rows.reduce((s, r) => s + r.overdueAmount, 0)),
    notYetDue: round2(rows.reduce((s, r) => s + r.notDueAmount, 0)),
    partiallyPaidBills,
  };
}

export function getVendorOutstandingDetail(
  vendorId: number,
  asOfDate = TODAY(),
): VendorOutstandingDetail | null {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;

  const bills = getPostedPurchaseInvoices()
    .filter((b) => b.vendorId === vendorId)
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

  const ledgerId = resolveVendorLedgerId(vendor);
  const ledger = loadChartOfAccounts().find((l) => l.id === ledgerId);
  const openingBalance = ledger?.openingBalance ?? 0;

  const totalPurchases = round2(bills.reduce((s, b) => s + b.grandTotal, 0));
  const totalPayments = round2(bills.reduce((s, b) => s + b.amountPaid, 0));
  const debitNotes = round2(bills.reduce((s, b) => s + b.amountDebited, 0));
  const creditNotes = vendorCreditNoteTotal(vendorId);
  const currentOutstanding = round2(
    bills.reduce((s, b) => s + getBillOutstanding(b), 0) + creditNotes,
  );

  return {
    vendor,
    ledgerId,
    openingBalance,
    totalPurchases,
    totalPayments,
    debitNotes,
    creditNotes,
    currentOutstanding,
    bills: bills.map((b) => buildBillRow(b, vendor, asOfDate)),
  };
}

// ── Ageing ───────────────────────────────────────────────────────────────────

export interface PayablesAgeingFilters {
  vendorId?: number;
  territory?: string;
  branch?: string;
}

export function computeVendorAgeingSummary(asOfDate = TODAY()) {
  const rows = computeVendorAgeingRows(asOfDate);
  return {
    totalPayables: round2(rows.reduce((s, r) => s + r.totalOutstanding, 0)),
    current: round2(rows.reduce((s, r) => s + r.currentNotDue, 0)),
    bucket0_30: round2(rows.reduce((s, r) => s + r.bucket0_30, 0)),
    bucket31_60: round2(rows.reduce((s, r) => s + r.bucket31_60, 0)),
    bucket61_90: round2(rows.reduce((s, r) => s + r.bucket61_90, 0)),
    bucket90Plus: round2(rows.reduce((s, r) => s + r.bucket90Plus, 0)),
  };
}

export function computeVendorAgeingRows(
  asOfDate = TODAY(),
  filters: PayablesAgeingFilters = {},
): VendorAgeingRow[] {
  const vendors = loadVendors();
  const bills = getPostedPurchaseInvoices().filter((b) => getBillOutstanding(b) > 0.009);
  const map = new Map<number, VendorAgeingRow>();

  for (const bill of bills) {
    if (!bill.vendorId) continue;
    const vendor = vendors.find((v) => v.id === bill.vendorId);
    if (!vendor) continue;

    if (filters.vendorId && vendor.id !== filters.vendorId) continue;
    const territory = vendorTerritory(vendor);
    const branch = vendorBranch(vendor);
    if (filters.territory && territory !== filters.territory) continue;
    if (filters.branch && branch !== filters.branch) continue;

    const outstanding = getBillOutstanding(bill);
    const dueDate = getPurchaseDueDate(bill.invoiceDate, vendor);
    const daysOverdue = Math.max(0, daysBetween(dueDate, asOfDate));
    const key = bucketKey(daysOverdue, asOfDate, dueDate);
    const meta = getVendorPayablesMeta(vendor.id);

    const row =
      map.get(vendor.id) ??
      ({
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        territory,
        purchaseManager: meta?.purchaseManager ?? "Purchase Desk",
        currentNotDue: 0,
        bucket0_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucket90Plus: 0,
        totalOutstanding: 0,
        oldestBillDate: bill.invoiceDate,
      } satisfies VendorAgeingRow);

    row[key] = round2(row[key] + outstanding);
    row.totalOutstanding = round2(row.totalOutstanding + outstanding);
    if (bill.invoiceDate < row.oldestBillDate) row.oldestBillDate = bill.invoiceDate;
    map.set(vendor.id, row);
  }

  // Supplier credit notes in current bucket (not yet due)
  for (const note of loadVendorCreditNotes().filter((n) => n.status === "approved")) {
    const vendor = vendors.find((v) => v.id === note.vendorId);
    if (!vendor) continue;
    if (filters.vendorId && vendor.id !== filters.vendorId) continue;
    const territory = vendorTerritory(vendor);
    if (filters.territory && territory !== filters.territory) continue;
    if (filters.branch && vendorBranch(vendor) !== filters.branch) continue;

    const meta = getVendorPayablesMeta(vendor.id);
    const row =
      map.get(vendor.id) ??
      ({
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        territory,
        purchaseManager: meta?.purchaseManager ?? "Purchase Desk",
        currentNotDue: 0,
        bucket0_30: 0,
        bucket31_60: 0,
        bucket61_90: 0,
        bucket90Plus: 0,
        totalOutstanding: 0,
        oldestBillDate: note.creditNoteDate,
      } satisfies VendorAgeingRow);

    row.currentNotDue = round2(row.currentNotDue + note.amount);
    row.totalOutstanding = round2(row.totalOutstanding + note.amount);
    map.set(vendor.id, row);
  }

  return Array.from(map.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
}

export function getVendorBillAgeing(vendorId: number, asOfDate = TODAY()) {
  const vendor = getVendorById(vendorId);
  if (!vendor) return [];
  return getPostedPurchaseInvoices()
    .filter((b) => b.vendorId === vendorId && getBillOutstanding(b) > 0.009)
    .map((b) => buildBillRow(b, vendor, asOfDate));
}

// ── Payment allocation ─────────────────────────────────────────────────────────

interface PaymentAllocationStoreEntry {
  voucherId: number;
  lines: PaymentAllocationLine[];
}

function loadPaymentAllocationStore(): PaymentAllocationStoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PAYMENT_ALLOCATION_KEY);
    return raw ? (JSON.parse(raw) as PaymentAllocationStoreEntry[]) : [];
  } catch {
    return [];
  }
}

function savePaymentAllocationStore(entries: PaymentAllocationStoreEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAYMENT_ALLOCATION_KEY, JSON.stringify(entries));
}

function paymentVendorLine(v: AccountingVoucher): { ledgerId: number; name: string } | null {
  const line = v.lines.find((l) => (Number(l.debit) || 0) > 0);
  if (!line) return null;
  return { ledgerId: line.ledgerId ?? 0, name: line.ledgerName || line.contactName || "" };
}

function bankLineName(v: AccountingVoucher): string {
  const line = v.lines.find((l) => (Number(l.credit) || 0) > 0);
  return line?.ledgerName ?? "Bank / Cash";
}

function resolveVendorFromPayment(v: AccountingVoucher): Vendor | undefined {
  const vendorLine = paymentVendorLine(v);
  if (!vendorLine) return undefined;
  const vendors = loadVendors();
  return vendors.find(
    (v) =>
      v.vendorName.toLowerCase() === vendorLine.name.toLowerCase() ||
      resolveVendorLedgerId(v) === vendorLine.ledgerId,
  );
}

function allocationStatus(paymentAmount: number, allocated: number): PaymentAllocationStatus {
  if (allocated <= 0.009) return "unallocated";
  if (allocated >= paymentAmount - 0.009) return "fully_allocated";
  return "partially_allocated";
}

export function loadPaymentAllocationRecords(): PaymentAllocationRecord[] {
  const store = loadPaymentAllocationStore();
  const vouchers = loadVouchers().filter(
    (v) => v.voucherType === "payment" && (v.status === "posted" || v.status === "approved"),
  );

  return vouchers
    .map((v) => {
      const vendor = resolveVendorFromPayment(v);
      const entry = store.find((e) => e.voucherId === v.id);
      const lines = entry?.lines ?? [];
      const allocatedAmount = round2(lines.reduce((s, l) => s + l.amount, 0));
      const paymentAmount = round2(v.totalDebit || v.totalCredit);
      return {
        voucherId: v.id,
        paymentNo: v.voucherNumber,
        paymentDate: v.date,
        vendorId: vendor?.id ?? 0,
        vendorName: vendor?.vendorName ?? paymentVendorLine(v)?.name ?? "—",
        paymentAmount,
        allocatedAmount,
        unallocatedAmount: round2(Math.max(0, paymentAmount - allocatedAmount)),
        bankAccount: bankLineName(v),
        referenceNo: v.referenceNo || "—",
        status: allocationStatus(paymentAmount, allocatedAmount),
        lines,
      } satisfies PaymentAllocationRecord;
    })
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

export function seedPaymentAllocations(entries: PaymentAllocationStoreEntry[]): void {
  savePaymentAllocationStore(entries);
}

// ── Filter options ───────────────────────────────────────────────────────────

export function getPayablesFilterOptions() {
  const vendors = loadVendors();
  const territories = [
    ...new Set(vendors.map((v) => vendorTerritory(v)).filter((t) => t && t !== "—")),
  ];
  const branches = [
    ...new Set(vendors.map((v) => vendorBranch(v)).filter((b) => b && b !== "—")),
  ];
  const managers = [
    ...new Set(
      vendors
        .map((v) => getVendorPayablesMeta(v.id)?.purchaseManager)
        .filter(Boolean) as string[],
    ),
  ];
  return { vendors, territories, branches, managers };
}

export function formatPayable(amount: number): string {
  return formatMoney(amount);
}

// ── Legacy payables helpers (due payments, employee claims) ───────────────────

function payableLedgerIds(): Set<number> {
  return new Set(
    getLedgersUnderSubGroupName("Trade Payables / Sundry Creditors").map((l) => l.id),
  );
}

function expensesPayableLedgerIds(): Set<number> {
  return new Set(getLedgersUnderSubGroupName("Expenses Payable").map((l) => l.id));
}

export interface EmployeeClaimPayableRow {
  employeeName: string;
  claimNo: string;
  amount: number;
  dueDate: string;
  status: "pending" | "approved" | "overdue";
}

export function computeEmployeeClaimsPayable(): EmployeeClaimPayableRow[] {
  const ledgerIds = expensesPayableLedgerIds();
  const vouchers = loadVouchers().filter(
    (v) =>
      (v.status === "posted" || v.status === "approved") &&
      v.narration.toLowerCase().includes("claim"),
  );
  const rows: EmployeeClaimPayableRow[] = [];

  for (const v of vouchers) {
    for (const line of v.lines) {
      if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) continue;
      if ((Number(line.credit) || 0) <= 0) continue;
      rows.push({
        employeeName: line.ledgerName,
        claimNo: v.referenceNo || v.voucherNumber,
        amount: Number(line.credit) || 0,
        dueDate: v.date,
        status: "approved",
      });
    }
  }
  return rows;
}

export function computeDuePayments(): { party: string; amount: number; dueDate: string; type: string }[] {
  const vendors = computeVendorOutstanding().map((v) => ({
    party: v.vendorName,
    amount: v.outstanding,
    dueDate: v.lastPurchaseDate,
    type: "Vendor",
  }));
  const claims = computeEmployeeClaimsPayable().map((c) => ({
    party: c.employeeName,
    amount: c.amount,
    dueDate: c.dueDate,
    type: "Employee Claim",
  }));
  return [...vendors, ...claims].sort((a, b) => b.amount - a.amount);
}
