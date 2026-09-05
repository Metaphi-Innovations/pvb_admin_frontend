import {
  getApiAgeingBucketKeys,
  type AgeingBreakpoints,
} from "@/lib/accounts/ageing-breakpoints";
import type { PayableStatus } from "@/lib/accounts/payables-data";
import type {
  AgingApiBillRow,
  AgingApiRow,
  AgingBucketMap,
  ApiPayableStatus,
  ApiSupplierBillOutstandingRow,
  ApiSupplierDetailBillRow,
  ApiVendorAgeingBillRow,
  ApiVendorAgeingGroup,
  ApiVendorAgeingRow,
  ApiVendorOutstandingRow,
  PayableBillApiRow,
  SupplierDetailBillApiRow,
  SupplierSummaryApiRow,
} from "@/types/payables.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** @deprecated Prefer getApiAgeingBucketKeys from ageing-breakpoints. */
export function buildBackendAgingBucketLabels(breakpoints: number[]): string[] {
  return getApiAgeingBucketKeys(breakpoints);
}

export function mapApiPayableStatus(status: ApiPayableStatus | "CLEAR"): PayableStatus {
  switch (status) {
    case "PAID":
    case "CLEAR":
      return "paid";
    case "PARTIALLY_PAID":
      return "partially_paid";
    case "OVERDUE":
      return "overdue";
    case "PENDING":
    case "REVERSED":
    default:
      return "unpaid";
  }
}

export function mapSupplierSummaryRow(row: SupplierSummaryApiRow): ApiVendorOutstandingRow {
  return {
    vendorId: row.supplierId,
    vendorName: row.supplierName,
    vendorCode: row.supplierCode,
    outstanding: row.outstandingAmount,
    notDueAmount: row.notDueAmount,
    overdueAmount: row.overdueAmount,
    oldestDueDate: row.oldestDueDate ?? "—",
    lastPaymentDate: row.lastPaymentDate ?? "—",
    status: mapApiPayableStatus(row.status),
  };
}

export function mapPayableBillRow(row: PayableBillApiRow): ApiSupplierBillOutstandingRow {
  return {
    openItemId: row.openItemId,
    billId: row.purchaseInvoiceId ?? row.openItemId,
    vendorId: row.supplierId,
    vendorName: row.supplierName,
    vendorCode: row.supplierCode,
    invoiceNo: row.purchaseInvoiceNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate ?? "—",
    billAmount: row.originalAmount,
    paidAmount: row.paidAmount,
    debitNoteAdjusted: row.debitNoteAdjustment,
    outstanding: row.outstandingAmount,
    overdueDays: row.overdueDays,
    status: mapApiPayableStatus(row.status),
  };
}

function moneyAmount(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapBucketAmounts(
  source: AgingBucketMap | undefined,
  bucketKeys: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of bucketKeys) {
    out[key] = moneyAmount(source?.[key]);
  }
  return out;
}

function mapAgingBillRow(
  row: AgingApiBillRow,
  bucketKeys: string[],
): ApiVendorAgeingBillRow {
  return {
    openItemId: row.openItemId,
    billId: row.billId ?? null,
    billNumber: row.billNumber ?? "",
    billDate: row.billDate ?? "",
    dueDate: row.dueDate ?? "",
    originalAmount: moneyAmount(row.originalAmount),
    settledAmount: moneyAmount(row.settledAmount),
    outstandingAmount: moneyAmount(row.outstandingAmount),
    ageDays: row.ageDays ?? null,
    notDueAmount: moneyAmount(row.notDueAmount),
    buckets: mapBucketAmounts(row.buckets, bucketKeys),
  };
}

/**
 * Maps a supplier ageing group from the API.
 * Bucket amounts are keyed by backend labels (e.g. "0-30"), not display strings.
 * Does not calculate ageing — only formats and preserves backend allocations.
 */
export function mapAgingVendorGroup(
  row: AgingApiRow,
  breakpoints: AgeingBreakpoints,
): ApiVendorAgeingGroup {
  const bucketKeys = getApiAgeingBucketKeys(breakpoints);
  const totalsSource = row.totals ?? {
    totalOutstanding: row.totalOutstanding,
    notDueAmount: row.notDueAmount ?? 0,
    buckets: row.buckets,
  };
  const bills = (row.bills ?? []).map((bill) => mapAgingBillRow(bill, bucketKeys));
  const totals = {
    totalOutstanding: moneyAmount(totalsSource.totalOutstanding),
    notDueAmount: moneyAmount(totalsSource.notDueAmount),
    buckets: mapBucketAmounts(totalsSource.buckets, bucketKeys),
  };

  if (process.env.NODE_ENV !== "production") {
    const bucketSum = Object.values(totals.buckets).reduce((s, v) => s + v, 0);
    const reconstructed = Math.round((totals.notDueAmount + bucketSum) * 100) / 100;
    if (Math.abs(reconstructed - totals.totalOutstanding) > 0.02) {
      console.warn("[payables ageing] vendor totals mismatch", row.supplierId, {
        totalOutstanding: totals.totalOutstanding,
        reconstructed,
      });
    }
  }

  return {
    vendorId: row.supplierId,
    vendorName: row.supplierName,
    vendorCode: row.supplierCode,
    bills,
    totals,
    bucketKeys,
  };
}

/** @deprecated Use mapAgingVendorGroup for the grouped Ageing View. */
export function mapPayablesAgingRow(
  row: AgingApiRow,
  breakpoints: AgeingBreakpoints,
): ApiVendorAgeingRow {
  const group = mapAgingVendorGroup(row, breakpoints);
  return {
    vendorId: group.vendorId,
    vendorName: group.vendorName,
    vendorCode: group.vendorCode,
    buckets: group.bucketKeys.map((key) => group.totals.buckets[key] ?? 0),
    totalOutstanding: group.totals.totalOutstanding,
  };
}

export function mapSupplierDetailBillRow(row: SupplierDetailBillApiRow): ApiSupplierDetailBillRow {
  return {
    openItemId: row.openItemId,
    billId: row.purchaseInvoiceId ?? row.openItemId,
    billNo: row.purchaseInvoiceNumber,
    billDate: row.invoiceDate,
    billAmount: row.invoiceAmount,
    paidAmount: row.paidAmount,
    debitNoteAdjusted: row.debitNoteAdjustment,
    outstanding: row.outstandingAmount,
    dueDate: row.dueDate ?? "—",
    daysOverdue: 0,
    status: mapApiPayableStatus(row.status),
  };
}

export const SUMMARY_SORT_KEY_TO_API: Record<string, string> = {
  vendorName: "supplier_name",
  vendorCode: "supplier_code",
  outstanding: "outstanding_amount",
  notDueAmount: "not_due_amount",
  overdueAmount: "overdue_amount",
  oldestDueDate: "oldest_due_date",
  lastPaymentDate: "last_payment_date",
  status: "status",
};

export const BILLS_SORT_KEY_TO_API: Record<string, string> = {
  vendorName: "supplier_name",
  invoiceNo: "purchase_invoice_number",
  invoiceDate: "invoice_date",
  dueDate: "due_date",
  billAmount: "original_amount",
  paidAmount: "paid_amount",
  debitNoteAdjusted: "debit_note_adjustment",
  outstanding: "outstanding_amount",
  overdueDays: "overdue_days",
  status: "status",
};

export const AGING_SORT_KEY_TO_API: Record<string, string> = {
  vendorName: "supplier_name",
  totalOutstanding: "total_outstanding",
};
