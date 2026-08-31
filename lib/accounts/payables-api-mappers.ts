import type { AgeingBreakpoints } from "@/lib/accounts/ageing-breakpoints";
import type { PayableStatus } from "@/lib/accounts/payables-data";
import type {
  AgingApiRow,
  ApiPayableStatus,
  ApiSupplierBillOutstandingRow,
  ApiSupplierDetailBillRow,
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

/** Backend ageing bucket keys (matches payables.utils buildAgingBucketLabels). */
export function buildBackendAgingBucketLabels(breakpoints: number[]): string[] {
  const labels: string[] = [];
  for (let i = 0; i < breakpoints.length; i++) {
    const start = breakpoints[i]!;
    const next = breakpoints[i + 1];
    if (next == null) {
      labels.push(`${start}+`);
    } else {
      labels.push(`${start}-${next - 1}`);
    }
  }
  return labels;
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

export function mapPayablesAgingRow(
  row: AgingApiRow,
  breakpoints: AgeingBreakpoints,
): ApiVendorAgeingRow {
  const backendLabels = buildBackendAgingBucketLabels(breakpoints);
  const buckets = backendLabels.map((label) => row.buckets[label] ?? 0);
  return {
    vendorId: row.supplierId,
    vendorName: row.supplierName,
    vendorCode: row.supplierCode,
    buckets,
    totalOutstanding: row.totalOutstanding,
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
