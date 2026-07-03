/**
 * Central Accounts data service — memoized localStorage loaders.
 * Use this instead of calling load*() directly in page components to avoid
 * repeated JSON.parse on every render. Invalidate after writes.
 */

import { loadInvoices, type InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadPurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCreditNotes, type CreditNoteRecord } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes, type DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadExpenses, type AccountExpense } from "@/app/(app)/accounts/expenses/expense-data";
import {
  loadVouchers,
  getVouchersByType,
  type AccountingVoucher,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";
import { loadFundTransfers, type FundTransferRecord } from "@/lib/accounts/fund-transfer-data";
import {
  loadReceiptAllocationRecords,
  loadCollectionFollowUps,
  computeInvoiceOutstanding,
  computeCustomerAgeingRows,
  type InvoiceOutstandingRow,
  type CustomerAgeingRow,
  type CollectionFollowUp,
  type ReceiptAllocationRecord,
} from "@/lib/accounts/receivables-data";
import {
  computeVendorOutstanding,
  computeVendorAgeingRows,
  loadPaymentAllocationRecords,
  type VendorOutstandingRow,
  type VendorAgeingRow,
  type PaymentAllocationRecord,
} from "@/lib/accounts/payables-data";
import { listPendingTaxInvoices, type PendingTaxInvoiceRow } from "@/lib/accounts/sales-workflow-data";
import {
  loadPaymentRuns,
  loadInventoryAdjustments,
  type PaymentRunRecord,
  type InventoryAdjustmentRecord,
} from "@/lib/accounts/accounts-mock-data";
import { loadAuditTrailRecords, type AuditTrailRecord } from "@/lib/accounts/audit-trail-data";

export type AccountsDataScope =
  | "invoices"
  | "purchaseInvoices"
  | "creditNotes"
  | "debitNotes"
  | "expenses"
  | "vouchers"
  | "coa"
  | "bankAccounts"
  | "fundTransfers"
  | "receivables"
  | "payables"
  | "pendingInvoices"
  | "paymentRuns"
  | "inventoryAdjustments"
  | "auditTrail"
  | "all";

type CacheEntry<T> = { data: T; epoch: number };

let cacheEpoch = 0;
const cache = new Map<string, CacheEntry<unknown>>();

/** Bump epoch and clear cache — call after any localStorage write. */
export function invalidateAccountsDataCache(scope: AccountsDataScope = "all"): void {
  if (scope === "all") {
    cacheEpoch += 1;
    cache.clear();
    return;
  }
  cache.delete(scope);
  // Related derived scopes
  if (scope === "invoices" || scope === "vouchers") {
    cache.delete("receivables");
    cache.delete("pendingInvoices");
  }
  if (scope === "purchaseInvoices" || scope === "vouchers") {
    cache.delete("payables");
  }
}

function getCached<T>(key: string, loader: () => T): T {
  const hit = cache.get(key);
  if (hit && hit.epoch === cacheEpoch) return hit.data as T;
  const data = loader();
  cache.set(key, { data, epoch: cacheEpoch });
  return data;
}

/** Filter rows by date field within inclusive ISO range. */
export function filterByDateRange<T>(
  rows: T[],
  dateField: keyof T,
  from?: string,
  to?: string,
): T[] {
  if (!from && !to) return rows;
  return rows.filter((row) => {
    const d = String(row[dateField] ?? "");
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

/** Client-side search across string fields. */
export function searchRows<T>(
  rows: T[],
  query: string,
  fields: (keyof T)[],
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    fields.some((f) => String(row[f] ?? "").toLowerCase().includes(q)),
  );
}

/** Paginate an in-memory array (default page size 25). */
export function paginateRows<T>(rows: T[], page: number, pageSize = 25): T[] {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

// ── Lazy loaders (one parse per epoch per collection) ─────────────────────────

export const accountsDataService = {
  getInvoices: (): InvoiceRecord[] => getCached("invoices", loadInvoices),
  getPurchaseInvoices: (): PurchaseInvoiceRecord[] =>
    getCached("purchaseInvoices", loadPurchaseInvoices),
  getCreditNotes: (): CreditNoteRecord[] => getCached("creditNotes", loadCreditNotes),
  getDebitNotes: (): DebitNoteRecord[] => getCached("debitNotes", loadDebitNotes),
  getExpenses: (): AccountExpense[] => getCached("expenses", loadExpenses),
  getVouchers: (): AccountingVoucher[] => getCached("vouchers", loadVouchers),
  getVouchersByType: (type: VoucherTypeCode): AccountingVoucher[] =>
    getCached(`vouchers:${type}`, () => getVouchersByType(type)),
  getChartOfAccounts: (): ChartOfAccount[] => getCached("coa", loadChartOfAccounts),
  getBankAccounts: () => getCached("bankAccounts", loadBankAccountMasters),
  getFundTransfers: (): FundTransferRecord[] => getCached("fundTransfers", loadFundTransfers),
  getPendingInvoices: (): PendingTaxInvoiceRow[] =>
    getCached("pendingInvoices", listPendingTaxInvoices),
  getCustomerOutstanding: (): InvoiceOutstandingRow[] =>
    getCached("receivables:outstanding", () => computeInvoiceOutstanding()),
  getCustomerAgeing: (): CustomerAgeingRow[] =>
    getCached("receivables:ageing", () => computeCustomerAgeingRows()),
  getCollectionFollowUps: (): CollectionFollowUp[] =>
    getCached("receivables:collections", loadCollectionFollowUps),
  getReceiptAllocations: (): ReceiptAllocationRecord[] =>
    getCached("receivables:allocations", loadReceiptAllocationRecords),
  getVendorOutstanding: (): VendorOutstandingRow[] =>
    getCached("payables:outstanding", () => computeVendorOutstanding()),
  getVendorAgeing: (): VendorAgeingRow[] =>
    getCached("payables:ageing", () => computeVendorAgeingRows()),
  getPaymentAllocations: (): PaymentAllocationRecord[] =>
    getCached("payables:allocations", loadPaymentAllocationRecords),
  getPaymentRuns: (): PaymentRunRecord[] => getCached("paymentRuns", loadPaymentRuns),
  getInventoryAdjustments: (): InventoryAdjustmentRecord[] =>
    getCached("inventoryAdjustments", loadInventoryAdjustments),
  getAuditTrail: (): AuditTrailRecord[] => getCached("auditTrail", loadAuditTrailRecords),
  invalidate: invalidateAccountsDataCache,
};

/** Alias for mock/demo data access — same service, clearer intent in demo contexts. */
export const accountsMockService = accountsDataService;
