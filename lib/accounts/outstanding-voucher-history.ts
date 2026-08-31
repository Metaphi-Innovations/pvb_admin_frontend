import { formatSrNo as formatPaymentSrNo } from "@/app/(app)/accounts/vouchers/payment/payment-voucher-utils";
import { formatSrNo as formatReceiptSrNo } from "@/app/(app)/accounts/vouchers/receipt/receipt-voucher-utils";
import { roundMoney } from "@/lib/accounts/money-format";
import { PaymentVoucherService } from "@/services/payment-voucher.service";
import { ReceiptVoucherService } from "@/services/receipt-voucher.service";
import type { CustomerReceiptHistoryRow } from "@/types/receivables.types";
import type { VendorPaymentHistoryRow } from "@/types/payables.types";
import {
  PAYMENT_BANK_TRANSACTION_MODE_LABELS,
  PAYMENT_STATUS_LABELS,
  type PaymentVoucherListItem,
} from "@/types/payment-voucher.types";
import {
  RECEIPT_STATUS_LABELS,
  type ReceiptVoucherListItem,
} from "@/types/receipt-voucher.types";
import type { StatusKey } from "@/lib/tokens";

/** Backend voucher list APIs cap page_size at 100. */
const HISTORY_PAGE_SIZE = 100;
const MAX_HISTORY_PAGES = 20;

async function fetchAllPaymentVoucherHistory(
  supplierId: string,
  asOfDate?: string,
): Promise<VendorPaymentHistoryRow[]> {
  const rows: VendorPaymentHistoryRow[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_HISTORY_PAGES) {
    const res = await PaymentVoucherService.list({
      supplier_id: supplierId,
      party_kind: "SUPPLIER",
      status: "POSTED",
      to_date: asOfDate,
      page,
      page_size: HISTORY_PAGE_SIZE,
      sort_by: "voucher_date",
      sort_dir: "desc",
    });
    rows.push(...(res.data ?? []).map(mapPaymentVoucherToHistoryRow));
    totalPages = res.pagination?.total_pages ?? 1;
    page += 1;
  }

  return rows;
}

async function fetchAllReceiptVoucherHistory(
  customerId: string,
  asOfDate?: string,
): Promise<CustomerReceiptHistoryRow[]> {
  const rows: CustomerReceiptHistoryRow[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_HISTORY_PAGES) {
    const res = await ReceiptVoucherService.list({
      customer_id: customerId,
      party_kind: "CUSTOMER",
      status: "POSTED",
      to_date: asOfDate,
      page,
      page_size: HISTORY_PAGE_SIZE,
      sort_by: "voucher_date",
      sort_dir: "desc",
    });
    rows.push(...(res.data ?? []).map(mapReceiptVoucherToHistoryRow));
    totalPages = res.pagination?.total_pages ?? 1;
    page += 1;
  }

  return rows;
}

function toMoney(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? roundMoney(n) : 0;
}

function snapshotBankName(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return "";
  const name =
    snapshot.bank_name ??
    snapshot.bankName ??
    snapshot.account_name ??
    snapshot.accountName;
  return typeof name === "string" ? name : "";
}

function resolveReference(row: {
  transaction_reference?: string | null;
  utr_number?: string | null;
  cheque_number?: string | null;
  narration?: string | null;
}): string {
  return (
    row.transaction_reference?.trim() ||
    row.utr_number?.trim() ||
    row.cheque_number?.trim() ||
    row.narration?.trim() ||
    "—"
  );
}

function resolveBankAccount(row: {
  cash_bank_ledger?: { ledger_name?: string | null } | null;
  bank_account_snapshot?: Record<string, unknown> | null;
}): string {
  return (
    row.cash_bank_ledger?.ledger_name?.trim() ||
    snapshotBankName(row.bank_account_snapshot) ||
    "—"
  );
}

export function paymentVoucherStatusToBadgeKey(status: string): StatusKey {
  switch (status) {
    case "POSTED":
    case "APPROVED":
      return "approved";
    case "PENDING_APPROVAL":
      return "pending";
    case "REJECTED":
      return "rejected";
    case "CANCELLED":
    case "REVERSED":
      return "closed";
    case "DRAFT":
      return "draft";
    default:
      return "inactive";
  }
}

export function mapPaymentVoucherToHistoryRow(
  row: PaymentVoucherListItem,
): VendorPaymentHistoryRow {
  const status = String(row.status);
  return {
    paymentVoucherId: row.payment_voucher_id,
    paymentNo: formatPaymentSrNo(row.sr_no),
    paymentDate: String(row.voucher_date).slice(0, 10),
    amount: toMoney(row.gross_party_amount),
    allocatedAmount: toMoney(row.allocated_amount),
    bankAccount: resolveBankAccount(row),
    referenceNo: resolveReference(row),
    status,
    statusLabel: PAYMENT_STATUS_LABELS[row.status] ?? status,
  };
}

export function mapReceiptVoucherToHistoryRow(
  row: ReceiptVoucherListItem,
): CustomerReceiptHistoryRow {
  const status = String(row.status);
  return {
    receiptVoucherId: row.receipt_voucher_id,
    receiptNo: formatReceiptSrNo(row.sr_no),
    receiptDate: String(row.voucher_date).slice(0, 10),
    amount: toMoney(row.gross_party_amount),
    allocatedAmount: toMoney(row.allocated_amount),
    bankAccount: resolveBankAccount(row),
    referenceNo: resolveReference(row),
    status,
    statusLabel: RECEIPT_STATUS_LABELS[row.status] ?? status,
  };
}

export async function fetchSupplierPaymentHistory(
  supplierId: string,
  asOfDate?: string,
): Promise<VendorPaymentHistoryRow[]> {
  return fetchAllPaymentVoucherHistory(supplierId, asOfDate);
}

export async function fetchCustomerReceiptHistory(
  customerId: string,
  asOfDate?: string,
): Promise<CustomerReceiptHistoryRow[]> {
  return fetchAllReceiptVoucherHistory(customerId, asOfDate);
}

/** Format settlement type / voucher type for invoice-level receipt history. */
export function formatSettlementMode(
  settlementType?: string,
  voucherType?: string,
): string {
  const raw = voucherType || settlementType || "";
  if (!raw) return "—";
  if (raw in PAYMENT_BANK_TRANSACTION_MODE_LABELS) {
    return PAYMENT_BANK_TRANSACTION_MODE_LABELS[
      raw as keyof typeof PAYMENT_BANK_TRANSACTION_MODE_LABELS
    ];
  }
  return raw.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
