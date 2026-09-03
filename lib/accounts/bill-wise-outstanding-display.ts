import type { StatusKey } from "@/lib/tokens";
import type {
  BillWiseOutstandingRowApi,
  BillWiseOutstandingSummaryApi,
  OutstandingBillDisplayRow,
  OutstandingBillSettlementDisplay,
  OutstandingBillSummaryDisplay,
} from "@/types/bill-wise-outstanding.types";
import type {
  BillSettlementApiRow,
  PayableBillApiRow,
} from "@/types/payables.types";

export function formatOutstandingReportDate(value?: string | null): string {
  if (!value || value === "—") return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

export function formatAgeingDays(days: number): string {
  const n = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  return n === 1 ? "1 day" : `${n} days`;
}

export function formatDisplayStatusLabel(status: string): string {
  const key = status.trim().toUpperCase().replace(/\s+/g, "_");
  switch (key) {
    case "UNPAID":
    case "PENDING":
    case "OPEN":
      return "Unpaid";
    case "PARTIALLY_PAID":
    case "PARTIALLY_RECEIVED":
    case "PARTIAL":
    case "PARTIALLY_SETTLED":
      return "Partially Paid";
    case "OVERDUE":
      return "Overdue";
    case "PAID":
    case "SETTLED":
    case "CLEAR":
      return "Paid";
    case "REVERSED":
      return "Reversed";
    default:
      return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function billWiseStatusToBadge(
  status: string,
): { status: StatusKey; label: string } {
  const key = status.trim().toUpperCase().replace(/\s+/g, "_");
  const label = formatDisplayStatusLabel(status);
  switch (key) {
    case "PAID":
    case "SETTLED":
    case "CLEAR":
      return { status: "approved", label };
    case "PARTIALLY_PAID":
    case "PARTIALLY_RECEIVED":
    case "PARTIAL":
    case "PARTIALLY_SETTLED":
      return { status: "partial", label };
    case "OVERDUE":
      return { status: "overdue", label };
    case "REVERSED":
      return { status: "rejected", label };
    case "UNPAID":
    case "PENDING":
    case "OPEN":
    default:
      return { status: "pending", label };
  }
}

export function mapBillWiseApiRow(
  row: BillWiseOutstandingRowApi,
): OutstandingBillDisplayRow {
  return {
    openItemId: row.openItemId,
    documentNumber: row.documentNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    originalAmount: row.originalAmount,
    adjustedAmount: row.adjustedAmount,
    outstandingAmount: row.outstandingAmount,
    ageingDays: row.ageingDays,
    displayStatus: row.displayStatus,
    accountingStatus: row.accountingStatus,
    isOverdue: row.isOverdue,
    sourceEntityType: row.source.entityType,
    sourceEntityId: row.source.entityId,
    referenceNumber: row.referenceNumber,
    partyName: row.party.ledgerName,
    partyCode: row.party.ledgerCode,
  };
}

export function mapBillWiseSummary(
  summary: BillWiseOutstandingSummaryApi,
): OutstandingBillSummaryDisplay {
  return {
    totalBills: summary.totalBills,
    totalInvoiceAmount: summary.totalInvoiceAmount,
    totalAdjustedAmount: summary.totalAdjustedAmount,
    totalOutstandingAmount: summary.totalOutstandingAmount,
    totalOverdueAmount: summary.totalOverdueAmount,
  };
}

/** Map payables bill API (as-of) into the shared display shape. */
export function mapPayableBillToDisplay(
  row: PayableBillApiRow,
): OutstandingBillDisplayRow {
  const adjusted = (row.paidAmount ?? 0) + (row.debitNoteAdjustment ?? 0);
  return {
    openItemId: row.openItemId,
    documentNumber: row.purchaseInvoiceNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    originalAmount: row.originalAmount,
    adjustedAmount: adjusted,
    outstandingAmount: row.outstandingAmount,
    ageingDays: row.overdueDays ?? 0,
    displayStatus: row.status,
    isOverdue: row.status === "OVERDUE",
    sourceEntityType: "PurchaseInvoice",
    sourceEntityId: row.purchaseInvoiceId,
    partyName: row.supplierName,
    partyCode: row.supplierCode,
  };
}

export function mapPayableSettlementToDisplay(
  row: BillSettlementApiRow,
): OutstandingBillSettlementDisplay {
  return {
    settlementId: row.settlementId,
    settlementDate: row.settlementDate,
    settlementType: row.settlementType,
    settlementAmount: row.grossSettlementAmount,
    voucherNumber: row.voucherNumber,
    referenceNumber: null,
    status: row.isReversed ? "REVERSED" : "ACTIVE",
    narration: row.narration,
  };
}

export const EMPTY_OUTSTANDING_SUMMARY: OutstandingBillSummaryDisplay = {
  totalBills: 0,
  totalInvoiceAmount: 0,
  totalAdjustedAmount: 0,
  totalOutstandingAmount: 0,
  totalOverdueAmount: 0,
};

export const BWO_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PAID", label: "Paid" },
] as const;

export const BWO_SORT_FIELDS = [
  "documentNumber",
  "invoiceDate",
  "dueDate",
  "originalAmount",
  "adjustedAmount",
  "outstandingAmount",
  "ageingDays",
] as const;
