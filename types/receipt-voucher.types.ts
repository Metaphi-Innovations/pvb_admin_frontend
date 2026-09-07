/** Receipt Voucher API types — aligned with backend validation / Prisma models. */

export type ReceiptPartyKind = "CUSTOMER" | "SUPPLIER_REFUND" | "OTHER_LEDGER";

export type ReceiptVoucherStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";

export type BankTransactionMode =
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

export type ReceiptAdjustmentType =
  | "CUSTOMER_TDS"
  | "DISCOUNT_ALLOWED"
  | "BANK_CHARGES"
  | "OTHER"
  | "ROUND_OFF";

export type AccountingEntryType = "DEBIT" | "CREDIT";

/**
 * Frontend-only treatment control for Customer receipts (not a backend DTO field).
 * Backend receives allocations[] + advance_amount; mixed is inferred when both > 0.
 */
export type ReceiptTreatmentUi =
  | "against_outstanding"
  | "advance_on_account"
  | "mixed_allocation";

export interface ReceiptVoucherConfig {
  approval_required: boolean;
}

export interface ReceiptAttachmentMeta {
  file_name: string;
  file_url: string;
  file_type?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
}

/** New unsaved browser File — never sent as attachment metadata JSON. */
export interface ReceiptPendingFile {
  id: string;
  file: File;
  /** Temporary object URL for local preview only; never persisted/submitted. */
  previewUrl: string;
}

/** Historical TDS Section snapshot returned on allocations (backend-built). */
export interface ReceiptTdsSectionSnapshot {
  tds_id?: string | null;
  tds_code?: string | null;
  tds_section_name?: string | null;
  tds_rate?: string | number | null;
  description?: string | null;
}

export interface ReceiptAllocationInput {
  open_item_id: string;
  allocated_amount: number | string;
  tds_amount?: number | string;
  /** Required by backend when tds_amount > 0. Cleared when tds_amount = 0. */
  tds_section_id?: string | null;
  discount_amount?: number | string;
  narration?: string | null;
}

export interface ReceiptAdjustmentInput {
  adjustment_type: ReceiptAdjustmentType;
  ledger_id?: string | null;
  entry_type?: AccountingEntryType | null;
  amount: number | string;
  narration?: string | null;
}

/** Business fields for create/update (attachments go via multipart File parts). */
export interface CreateReceiptVoucherPayload {
  voucher_date: string;
  warehouse_id: string;
  party_kind: ReceiptPartyKind;
  customer_id?: string | null;
  supplier_id?: string | null;
  other_ledger_id?: string | null;
  bank_account_id?: string | null;
  cash_bank_ledger_id: string;
  transaction_mode: BankTransactionMode;
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
  allocations?: ReceiptAllocationInput[];
  adjustments?: ReceiptAdjustmentInput[];
}

export interface UpdateReceiptVoucherPayload extends CreateReceiptVoucherPayload {
  /** Persisted attachment metadata to retain (JSON-stringified in multipart). */
  existing_attachments?: ReceiptAttachmentMeta[] | null;
}

export interface SubmitReceiptVoucherPayload {
  approver_id: string;
}

export interface RejectReceiptVoucherPayload {
  rejection_reason: string;
}

export interface CancelReceiptVoucherPayload {
  reason: string;
}

export interface ReverseReceiptVoucherPayload {
  reason: string;
  reversal_date?: string | null;
}

export interface ReceiptVoucherListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  financial_year_id?: string;
  warehouse_id?: string;
  /** Single status or comma-separated list. */
  status?: ReceiptVoucherStatus | string;
  /** Single party kind or comma-separated list. */
  party_kind?: ReceiptPartyKind | string;
  customer_id?: string;
  supplier_id?: string;
  cash_bank_ledger_id?: string;
  /** Single mode or comma-separated list. */
  transaction_mode?: BankTransactionMode | string;
  from_date?: string;
  to_date?: string;
  sr_no?: number;
  sort_by?:
    | "sr_no"
    | "voucher_date"
    | "party_kind"
    | "transaction_mode"
    | "status"
    | "gross_party_amount"
    | "net_bank_amount"
    | "created_at";
  sort_dir?: "asc" | "desc";
  gross_min?: number;
  gross_max?: number;
  net_bank_min?: number;
  net_bank_max?: number;
  warehouse_names?: string;
  party_names?: string;
  cash_bank_names?: string;
}

export interface ReceiptOpenItemRow {
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

export interface CustomerOutstandingResponse {
  customer_id: string;
  party_ledger_id: string;
  items: ReceiptOpenItemRow[];
}

export interface SupplierRecoverableResponse {
  supplier_id: string;
  party_ledger_id: string;
  items: ReceiptOpenItemRow[];
}

export interface ReceiptLedgerRef {
  ledger_id: string;
  ledger_code?: string | null;
  ledger_name?: string | null;
}

export interface ReceiptPartyRef {
  customer_id?: string;
  customer_code?: string | null;
  customer_name?: string | null;
  supplier_id?: string;
  supplier_code?: string | null;
  supplier_name?: string | null;
}

export interface ReceiptWarehouseRef {
  warehouse_id: string;
  warehouse_name?: string | null;
}

export interface ReceiptBankAccountRef {
  bank_account_id: string;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  ledger_id?: string | null;
}

export interface ReceiptAllocationRow {
  receipt_voucher_allocation_id?: string;
  open_item_id: string;
  allocated_amount: string | number;
  tds_amount?: string | number;
  tds_section_id?: string | null;
  tds_section_snapshot?: ReceiptTdsSectionSnapshot | null;
  discount_amount?: string | number;
  narration?: string | null;
  open_item_snapshot?: Record<string, unknown> | null;
  line_number?: number;
}

export interface ReceiptAdjustmentRow {
  receipt_voucher_adjustment_id?: string;
  adjustment_type: ReceiptAdjustmentType;
  ledger_id?: string | null;
  entry_type?: AccountingEntryType | null;
  amount: string | number;
  narration?: string | null;
  line_number?: number;
  ledger?: ReceiptLedgerRef | null;
  ledger_snapshot?: Record<string, unknown> | null;
}

export interface ReceiptAccountingLine {
  line_number?: number;
  ledger_id?: string;
  ledger_name?: string | null;
  ledger_code?: string | null;
  entry_type?: AccountingEntryType | string;
  amount?: string | number;
  narration?: string | null;
}

export interface ReceiptAccountingVoucherSummary {
  accounting_voucher_id: string;
  voucher_number?: string | null;
  voucher_date?: string | null;
  status?: string | null;
  total_debit?: string | null;
  total_credit?: string | null;
  lines?: ReceiptAccountingLine[];
  bank_details?: unknown;
  settlements?: unknown[];
}

export interface ReceiptVoucherDetail {
  receipt_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  financial_year_id?: string;
  warehouse_id: string;
  party_kind: ReceiptPartyKind;
  customer_id?: string | null;
  supplier_id?: string | null;
  party_ledger_id?: string | null;
  other_ledger_id?: string | null;
  bank_account_id?: string | null;
  cash_bank_ledger_id: string;
  transaction_mode: BankTransactionMode;
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
  attachments?: ReceiptAttachmentMeta[] | null;
  status: ReceiptVoucherStatus;
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
  customer?: ReceiptPartyRef | null;
  supplier?: ReceiptPartyRef | null;
  warehouse?: ReceiptWarehouseRef | null;
  party_ledger?: ReceiptLedgerRef | null;
  other_ledger?: ReceiptLedgerRef | null;
  cash_bank_ledger?: ReceiptLedgerRef | null;
  bank_account?: ReceiptBankAccountRef | null;
  allocations?: ReceiptAllocationRow[];
  adjustments?: ReceiptAdjustmentRow[];
  customer_snapshot?: Record<string, unknown> | null;
  supplier_snapshot?: Record<string, unknown> | null;
  warehouse_snapshot?: Record<string, unknown> | null;
  party_ledger_snapshot?: Record<string, unknown> | null;
  other_ledger_snapshot?: Record<string, unknown> | null;
  bank_account_snapshot?: Record<string, unknown> | null;
  cash_bank_ledger_snapshot?: Record<string, unknown> | null;
  accounting_voucher?: ReceiptAccountingVoucherSummary | null;
  customer_advance?: unknown;
  reversal_voucher?: {
    accounting_voucher_id: string;
    voucher_number?: string | null;
    voucher_date?: string | null;
    status?: string | null;
  } | null;
  created_by_user?: { user_id?: string; full_name?: string | null } | null;
}

export interface ReceiptVoucherListItem {
  receipt_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  warehouse_id: string;
  party_kind: ReceiptPartyKind;
  customer_id?: string | null;
  supplier_id?: string | null;
  cash_bank_ledger_id?: string;
  bank_account_id?: string | null;
  transaction_mode: BankTransactionMode;
  gross_party_amount: string | number;
  net_bank_amount: string | number;
  allocated_amount?: string | number;
  transaction_reference?: string | null;
  utr_number?: string | null;
  cheque_number?: string | null;
  status: ReceiptVoucherStatus;
  created_at?: string;
  created_by?: string | null;
  customer?: ReceiptPartyRef | null;
  supplier?: ReceiptPartyRef | null;
  warehouse?: ReceiptWarehouseRef | null;
  cash_bank_ledger?: ReceiptLedgerRef | null;
  narration?: string | null;
}

export interface ReceiptVoucherListResponse {
  data: ReceiptVoucherListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export const RECEIPT_PARTY_KIND_LABELS: Record<ReceiptPartyKind, string> = {
  CUSTOMER: "Customer",
  SUPPLIER_REFUND: "Supplier Refund",
  OTHER_LEDGER: "Other Ledger",
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptVoucherStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
  REVERSED: "Reversed",
};

export const BANK_TRANSACTION_MODE_LABELS: Record<BankTransactionMode, string> = {
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

export const RECEIPT_ADJUSTMENT_TYPE_LABELS: Record<ReceiptAdjustmentType, string> = {
  CUSTOMER_TDS: "Customer TDS",
  DISCOUNT_ALLOWED: "Discount Allowed",
  BANK_CHARGES: "Bank Charges",
  OTHER: "Other Adjustment",
  ROUND_OFF: "Round Off",
};

export const BANK_TRANSACTION_MODES: BankTransactionMode[] = [
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
