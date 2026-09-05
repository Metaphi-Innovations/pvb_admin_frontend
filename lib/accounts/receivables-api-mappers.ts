import {
  getApiAgeingBucketKeys,
  type AgeingBreakpoints,
} from "@/lib/accounts/ageing-breakpoints";
import { formatSettlementMode } from "@/lib/accounts/outstanding-voucher-history";
import type {
  ApiCollectionFollowUpRow,
  ApiCustomerAgeingGroup,
  ApiCustomerAgeingInvoiceRow,
  ApiCustomerInvoiceOutstandingRow,
  ApiCustomerOutstandingRow,
  ApiInvoiceOutstandingRow,
} from "@/types/receivables.types";
import type {
  CollectionFollowUpStatus,
  ReceivableStatus,
} from "@/lib/accounts/receivables-data";
import type {
  AgingApiInvoiceRow,
  AgingApiRow,
  AgingBucketMap,
  ApiFollowUpStatus,
  ApiReceivableStatus,
  CustomerDetailInvoiceApiRow,
  CustomerSummaryApiRow,
  FollowUpApiRow,
  FollowUpHistoryApiRow,
  InvoiceSettlementApiRow,
  ReceivableInvoiceApiRow,
} from "@/types/receivables.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function mapApiReceivableStatus(status: ApiReceivableStatus | "CLEAR"): ReceivableStatus {
  switch (status) {
    case "PAID":
    case "CLEAR":
      return "paid";
    case "PARTIALLY_RECEIVED":
      return "partially_paid";
    case "OVERDUE":
      return "overdue";
    case "PENDING":
    case "REVERSED":
    default:
      return "unpaid";
  }
}

export function mapUiReceivableStatusToApi(status: ReceivableStatus): ApiReceivableStatus {
  switch (status) {
    case "paid":
      return "PAID";
    case "partially_paid":
      return "PARTIALLY_RECEIVED";
    case "overdue":
      return "OVERDUE";
    case "unpaid":
    default:
      return "PENDING";
  }
}

const FOLLOW_UP_TO_API: Record<CollectionFollowUpStatus, ApiFollowUpStatus> = {
  not_contacted: "NOT_CONTACTED",
  follow_up_scheduled: "FOLLOW_UP_SCHEDULED",
  promise_to_pay: "PROMISE_TO_PAY",
  part_payment_received: "PART_PAYMENT_RECEIVED",
  escalated: "ESCALATED",
  closed: "CLOSED",
};

const FOLLOW_UP_FROM_API: Record<ApiFollowUpStatus, CollectionFollowUpStatus> = {
  NOT_CONTACTED: "not_contacted",
  FOLLOW_UP_SCHEDULED: "follow_up_scheduled",
  PROMISE_TO_PAY: "promise_to_pay",
  PART_PAYMENT_RECEIVED: "part_payment_received",
  ESCALATED: "escalated",
  CLOSED: "closed",
};

export function mapFollowUpStatusToApi(status: CollectionFollowUpStatus): ApiFollowUpStatus {
  return FOLLOW_UP_TO_API[status];
}

export function mapFollowUpStatusFromApi(status: ApiFollowUpStatus): CollectionFollowUpStatus {
  return FOLLOW_UP_FROM_API[status];
}

export function mapCustomerSummaryRow(row: CustomerSummaryApiRow): ApiCustomerOutstandingRow {
  return {
    customerId: row.customerId,
    customerName: row.customerName,
    customerCode: row.customerCode,
    salesExecutive: row.salesperson?.name ?? "—",
    salespersonId: row.salesperson?.id,
    outstanding: row.outstandingAmount,
    notDueAmount: row.notDueAmount,
    overdueAmount: row.overdueAmount,
    oldestDueDate: row.oldestDueDate ?? "—",
    lastReceiptDate: row.lastReceiptDate ?? "—",
    status: mapApiReceivableStatus(row.status),
  };
}

export function mapReceivableInvoiceRow(row: ReceivableInvoiceApiRow): ApiInvoiceOutstandingRow {
  return {
    openItemId: row.openItemId,
    invoiceId: row.invoiceId ?? row.openItemId,
    customerId: row.customerId,
    customerName: row.customerName,
    customerCode: row.customerCode,
    gstin: "",
    invoiceNo: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate ?? "—",
    invoiceAmount: row.originalAmount,
    receivedAmount: row.receivedAmount,
    outstandingAmount: row.outstandingAmount,
    overdueDays: row.overdueDays,
    status: mapApiReceivableStatus(row.status),
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

function mapAgingInvoiceRow(
  row: AgingApiInvoiceRow,
  bucketKeys: string[],
): ApiCustomerAgeingInvoiceRow {
  return {
    openItemId: row.openItemId,
    invoiceId: row.invoiceId ?? null,
    invoiceNumber: row.invoiceNumber ?? "",
    invoiceDate: row.invoiceDate ?? "",
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
 * Maps a customer ageing group from the API.
 * Bucket amounts are keyed by backend labels (e.g. "0-30"), not display strings.
 */
export function mapAgingCustomerGroup(
  row: AgingApiRow,
  breakpoints: AgeingBreakpoints,
): ApiCustomerAgeingGroup {
  const bucketKeys = getApiAgeingBucketKeys(breakpoints);
  const totalsSource = row.totals ?? {
    totalOutstanding: row.totalOutstanding,
    notDueAmount: row.notDueAmount ?? 0,
    buckets: row.buckets,
  };
  const invoices = (row.invoices ?? []).map((inv) =>
    mapAgingInvoiceRow(inv, bucketKeys),
  );
  const totals = {
    totalOutstanding: moneyAmount(totalsSource.totalOutstanding),
    notDueAmount: moneyAmount(totalsSource.notDueAmount),
    buckets: mapBucketAmounts(totalsSource.buckets, bucketKeys),
  };

  if (process.env.NODE_ENV !== "production") {
    const bucketSum = Object.values(totals.buckets).reduce((s, v) => s + v, 0);
    const reconstructed = Math.round((totals.notDueAmount + bucketSum) * 100) / 100;
    if (Math.abs(reconstructed - totals.totalOutstanding) > 0.02) {
      console.warn(
        "[receivables ageing] customer totals mismatch",
        row.customerId,
        { totalOutstanding: totals.totalOutstanding, reconstructed },
      );
    }
  }

  return {
    customerId: row.customerId,
    customerName: row.customerName,
    customerCode: row.customerCode,
    invoices,
    totals,
    bucketKeys,
  };
}

/** @deprecated Use mapAgingCustomerGroup for the grouped Ageing View. */
export function mapAgingRow(
  row: AgingApiRow,
  breakpoints: AgeingBreakpoints,
): {
  customerId: string;
  customerName: string;
  customerCode: string;
  territory: string;
  salesExecutive: string;
  buckets: number[];
  totalOutstanding: number;
  oldestInvoiceDate: string;
} {
  const group = mapAgingCustomerGroup(row, breakpoints);
  return {
    customerId: group.customerId,
    customerName: group.customerName,
    customerCode: group.customerCode,
    territory: "—",
    salesExecutive: "—",
    buckets: group.bucketKeys.map((key) => group.totals.buckets[key] ?? 0),
    totalOutstanding: group.totals.totalOutstanding,
    oldestInvoiceDate: group.invoices[0]?.invoiceDate || "—",
  };
}

export function mapFollowUpRow(row: FollowUpApiRow): ApiCollectionFollowUpRow {
  return {
    id: row.followUpId,
    followUpNo: row.followUpId.slice(0, 8).toUpperCase(),
    customerId: row.customerId,
    customerName: row.customerName,
    openItemId: row.openItemId ?? null,
    invoiceId: row.openItemId ?? null,
    invoiceNo: row.invoiceNumber ?? "",
    outstandingAmount: row.outstandingAmount,
    dueDate: "—",
    followUpDate: row.createdAt.slice(0, 10),
    assignedTo: row.assignedTo?.name ?? "—",
    contactPerson: "",
    phone: "",
    promiseToPayDate: row.promisedPaymentDate ?? "",
    promiseAmount: row.committedAmount ?? 0,
    status: mapFollowUpStatusFromApi(row.status),
    remarks: row.remarks ?? "",
    nextFollowUpDate: row.nextFollowUpDate ?? "",
  };
}

export function mapFollowUpHistoryRow(row: FollowUpHistoryApiRow) {
  return {
    id: row.activityId,
    followUpId: row.followUpId,
    date: row.activityDate.slice(0, 10),
    status: mapFollowUpStatusFromApi(row.status),
    remarks: row.remarks ?? "",
    contactMethod: row.contactMethod,
    nextFollowUpDate: row.nextFollowUpDate,
    promisedPaymentDate: row.promisedPaymentDate,
    committedAmount: row.committedAmount,
    assignedTo: row.assignedTo?.name,
  };
}

export function mapCustomerDetailInvoiceRow(
  row: CustomerDetailInvoiceApiRow,
): ApiCustomerInvoiceOutstandingRow {
  return {
    openItemId: row.openItemId,
    invoiceId: row.invoiceId ?? row.openItemId,
    invoiceNo: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate ?? "—",
    invoiceAmount: row.invoiceAmount,
    paidAmount: row.receivedAmount,
    outstanding: row.outstandingAmount,
    status: mapApiReceivableStatus(row.status),
  };
}

export function mapSettlementToReceiptHistory(
  row: InvoiceSettlementApiRow,
): import("@/lib/accounts/receivables-data").InvoiceReceiptHistoryRow {
  return {
    receiptNo: row.voucherNumber ?? row.settlementId.slice(0, 8).toUpperCase(),
    receiptDate: row.settlementDate,
    amount: row.grossSettlementAmount,
    paymentMode: formatSettlementMode(row.settlementType, row.voucherType),
    referenceNo: row.narration ?? "—",
  };
}

export const SUMMARY_SORT_KEY_TO_API: Record<string, string> = {
  customerName: "customer_name",
  outstanding: "outstanding_amount",
  notDueAmount: "not_due_amount",
  overdueAmount: "overdue_amount",
  oldestDueDate: "oldest_due_date",
  lastReceiptDate: "last_receipt_date",
  status: "status",
};

export const INVOICE_SORT_KEY_TO_API: Record<string, string> = {
  customerName: "customer_name",
  invoiceNo: "invoice_number",
  invoiceDate: "invoice_date",
  dueDate: "due_date",
  invoiceAmount: "original_amount",
  receivedAmount: "settled_amount",
  outstandingAmount: "outstanding_amount",
  overdueDays: "overdue_days",
  status: "status",
};

export const AGING_SORT_KEY_TO_API: Record<string, string> = {
  customerName: "customer_name",
  totalOutstanding: "total_outstanding",
};

export const FOLLOW_UP_SORT_KEY_TO_API: Record<string, string> = {
  customerName: "customer_name",
  invoiceNo: "invoice_number",
  outstandingAmount: "outstanding_amount",
  status: "status",
  promiseToPayDate: "promised_payment_date",
  nextFollowUpDate: "next_follow_up_date",
  remarks: "remarks",
};
