/** Payment Voucher API types — aligned with backend validation / Prisma models. */

export type PaymentPartyKind = "SUPPLIER" | "CUSTOMER_REFUND" | "OTHER_LEDGER";

export type PaymentVoucherStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";

export type PaymentBankTransactionMode =
  | "CASH"
  | "CHEQUE"
  | "DEMAND_DRAFT"
  | "NEFT"
  | "RTGS"
  | "IMPS"
  | "UPI"
  | "CARD"
  | "BANK_TRANSFER"
  | "OTHER";

export type PaymentAdjustmentType =
  | "SUPPLIER_TDS"
  | "DISCOUNT_RECEIVED"
  | "OTHER"
  | "ROUND_OFF";

export type PaymentAccountingEntryType = "DEBIT" | "CREDIT";

/** Frontend-only treatment control for Supplier payments (not a backend DTO field). */
export type PaymentTreatmentUi = "against_outstanding" | "advance_on_account";

export interface PaymentVoucherConfig {
  approval_required: boolean;
}

export interface PaymentAttachmentMeta {
  file_name: string;
  file_url: string;
  file_type?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
}

export interface PaymentPendingFile {
  id: string;
  file: File;
  /** Temporary object URL for local preview only; never persisted/submitted. */
  previewUrl: string;
}

export interface PaymentAllocationInput {
  open_item_id: string;
  allocated_amount: number | string;
  tds_amount?: number | string;
  discount_amount?: number | string;
  narration?: string | null;
}

export interface PaymentAdjustmentInput {
  adjustment_type: PaymentAdjustmentType;
  ledger_id?: string | null;
  entry_type?: PaymentAccountingEntryType | null;
  amount: number | string;
  narration?: string | null;
}

export interface CreatePaymentVoucherPayload {
  voucher_date: string;
  warehouse_id: string;
  party_kind: PaymentPartyKind;
  customer_id?: string | null;
  supplier_id?: string | null;
  other_ledger_id?: string | null;
  bank_account_id?: string | null;
  cash_bank_ledger_id: string;
  transaction_mode: PaymentBankTransactionMode;
  cheque_number?: string | null;
  cheque_date?: string | null;
  utr_number?: string | null;
  transaction_reference?: string | null;
  instrument_date?: string | null;
  transaction_date?: string | null;
  gross_party_amount?: number | string | null;
  advance_amount?: number | string;
  narration?: string | null;
  remarks?: string | null;
  allocations?: PaymentAllocationInput[];
  adjustments?: PaymentAdjustmentInput[];
}

export interface UpdatePaymentVoucherPayload extends CreatePaymentVoucherPayload {
  existing_attachments?: PaymentAttachmentMeta[] | null;
}

export interface SubmitPaymentVoucherPayload {
  approver_id: string;
}

export interface RejectPaymentVoucherPayload {
  rejection_reason: string;
}

export interface CancelPaymentVoucherPayload {
  reason: string;
}

export interface ReversePaymentVoucherPayload {
  reason: string;
  reversal_date?: string | null;
}

export interface PaymentVoucherListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  financial_year_id?: string;
  warehouse_id?: string;
  status?: PaymentVoucherStatus;
  party_kind?: PaymentPartyKind;
  customer_id?: string;
  supplier_id?: string;
  cash_bank_ledger_id?: string;
  transaction_mode?: PaymentBankTransactionMode;
  from_date?: string;
  to_date?: string;
  sr_no?: number;
}

export interface PaymentOpenItemRow {
  open_item_id: string;
  open_item_type: string;
  document_number: string | null;
  document_date: string | null;
  due_date?: string | null;
  original_amount: string;
  settled_amount: string;
  outstanding_amount: string;
  status: string;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  balance_type?: string | null;
}

export interface SupplierOutstandingResponse {
  supplier_id: string;
  party_ledger_id: string;
  items: PaymentOpenItemRow[];
}

export interface CustomerRefundableResponse {
  customer_id: string;
  party_ledger_id: string;
  items: PaymentOpenItemRow[];
}

export interface PaymentLedgerRef {
  ledger_id: string;
  ledger_code?: string | null;
  ledger_name?: string | null;
}

export interface PaymentPartyRef {
  customer_id?: string;
  customer_code?: string | null;
  customer_name?: string | null;
  supplier_id?: string;
  supplier_code?: string | null;
  supplier_name?: string | null;
}

export interface PaymentWarehouseRef {
  warehouse_id: string;
  warehouse_name?: string | null;
}

export interface PaymentBankAccountRef {
  bank_account_id: string;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  ledger_id?: string | null;
}

export interface PaymentAllocationRow {
  payment_voucher_allocation_id?: string;
  open_item_id: string;
  allocated_amount: string | number;
  tds_amount?: string | number;
  discount_amount?: string | number;
  narration?: string | null;
  open_item_snapshot?: Record<string, unknown> | null;
  line_number?: number;
}

export interface PaymentAdjustmentRow {
  payment_voucher_adjustment_id?: string;
  adjustment_type: PaymentAdjustmentType;
  ledger_id?: string | null;
  entry_type?: PaymentAccountingEntryType | null;
  amount: string | number;
  narration?: string | null;
  line_number?: number;
  ledger?: PaymentLedgerRef | null;
  ledger_snapshot?: Record<string, unknown> | null;
}

export interface PaymentAccountingLine {
  line_number?: number;
  ledger_id?: string;
  ledger_name?: string | null;
  ledger_code?: string | null;
  entry_type?: PaymentAccountingEntryType | string;
  amount?: string | number;
  narration?: string | null;
}

export interface PaymentAccountingVoucherSummary {
  accounting_voucher_id: string;
  voucher_number?: string | null;
  voucher_date?: string | null;
  status?: string | null;
  total_debit?: string | null;
  total_credit?: string | null;
  lines?: PaymentAccountingLine[];
  bank_details?: unknown;
  settlements?: unknown[];
}

export interface PaymentVoucherDetail {
  payment_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  financial_year_id?: string;
  warehouse_id: string;
  party_kind: PaymentPartyKind;
  customer_id?: string | null;
  supplier_id?: string | null;
  party_ledger_id?: string | null;
  other_ledger_id?: string | null;
  bank_account_id?: string | null;
  cash_bank_ledger_id: string;
  transaction_mode: PaymentBankTransactionMode;
  cheque_number?: string | null;
  cheque_date?: string | null;
  utr_number?: string | null;
  transaction_reference?: string | null;
  instrument_date?: string | null;
  transaction_date?: string | null;
  gross_party_amount: string | number;
  total_adjustment_debit?: string | number;
  total_adjustment_credit?: string | number;
  net_bank_amount: string | number;
  allocated_amount?: string | number;
  advance_amount?: string | number;
  narration?: string | null;
  remarks?: string | null;
  attachments?: PaymentAttachmentMeta[] | null;
  status: PaymentVoucherStatus;
  current_approver_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  posted_by?: string | null;
  posted_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  reversed_by?: string | null;
  reversed_at?: string | null;
  reversal_reason?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  customer?: PaymentPartyRef | null;
  supplier?: PaymentPartyRef | null;
  warehouse?: PaymentWarehouseRef | null;
  party_ledger?: PaymentLedgerRef | null;
  other_ledger?: PaymentLedgerRef | null;
  cash_bank_ledger?: PaymentLedgerRef | null;
  bank_account?: PaymentBankAccountRef | null;
  allocations?: PaymentAllocationRow[];
  adjustments?: PaymentAdjustmentRow[];
  customer_snapshot?: Record<string, unknown> | null;
  supplier_snapshot?: Record<string, unknown> | null;
  warehouse_snapshot?: Record<string, unknown> | null;
  party_ledger_snapshot?: Record<string, unknown> | null;
  other_ledger_snapshot?: Record<string, unknown> | null;
  bank_account_snapshot?: Record<string, unknown> | null;
  cash_bank_ledger_snapshot?: Record<string, unknown> | null;
  accounting_voucher?: PaymentAccountingVoucherSummary | null;
  supplier_advance?: unknown;
  reversal_voucher?: {
    accounting_voucher_id: string;
    voucher_number?: string | null;
    voucher_date?: string | null;
    status?: string | null;
  } | null;
  created_by_user?: { user_id?: string; full_name?: string | null } | null;
}

export interface PaymentVoucherListItem {
  payment_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  warehouse_id: string;
  party_kind: PaymentPartyKind;
  customer_id?: string | null;
  supplier_id?: string | null;
  cash_bank_ledger_id?: string;
  bank_account_id?: string | null;
  transaction_mode: PaymentBankTransactionMode;
  gross_party_amount: string | number;
  net_bank_amount: string | number;
  status: PaymentVoucherStatus;
  created_at?: string;
  created_by?: string | null;
  customer?: PaymentPartyRef | null;
  supplier?: PaymentPartyRef | null;
  warehouse?: PaymentWarehouseRef | null;
  cash_bank_ledger?: PaymentLedgerRef | null;
  other_ledger?: PaymentLedgerRef | null;
  narration?: string | null;
}

export interface PaymentVoucherListResponse {
  data: PaymentVoucherListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export const PAYMENT_PARTY_KIND_LABELS: Record<PaymentPartyKind, string> = {
  SUPPLIER: "Supplier",
  CUSTOMER_REFUND: "Customer Refund",
  OTHER_LEDGER: "Other Ledger",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentVoucherStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
  REVERSED: "Reversed",
};

export const PAYMENT_BANK_TRANSACTION_MODE_LABELS: Record<
  PaymentBankTransactionMode,
  string
> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  DEMAND_DRAFT: "Demand Draft",
  NEFT: "NEFT",
  RTGS: "RTGS",
  IMPS: "IMPS",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

export const PAYMENT_ADJUSTMENT_TYPE_LABELS: Record<PaymentAdjustmentType, string> = {
  SUPPLIER_TDS: "Supplier TDS",
  DISCOUNT_RECEIVED: "Discount Received",
  OTHER: "Other Adjustment",
  ROUND_OFF: "Round Off",
};

export const PAYMENT_BANK_TRANSACTION_MODES: PaymentBankTransactionMode[] = [
  "CASH",
  "CHEQUE",
  "DEMAND_DRAFT",
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
];
