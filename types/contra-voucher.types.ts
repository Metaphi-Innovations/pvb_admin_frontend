/** Contra Voucher API types — aligned with backend ContraVoucher module. */

export type ContraVoucherStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";

export type ContraAccountType = "CASH" | "BANK";

export type ContraBankTransactionMode =
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

export interface ContraVoucherConfig {
  approval_required: boolean;
  cross_warehouse_cash_supported?: boolean;
  cross_warehouse_bank_to_bank_supported?: boolean;
}

export interface ContraAttachmentMeta {
  file_name: string;
  file_url: string;
  file_type?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
}

/** New unsaved browser File — never sent as attachment metadata JSON. */
export interface ContraPendingFile {
  id: string;
  file: File;
  /** Temporary object URL for local preview only; never persisted/submitted. */
  previewUrl: string;
}

export interface CreateContraVoucherPayload {
  voucher_date: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  from_account_type: ContraAccountType;
  to_account_type: ContraAccountType;
  from_cash_ledger_id?: string | null;
  to_cash_ledger_id?: string | null;
  from_bank_account_id?: string | null;
  to_bank_account_id?: string | null;
  amount: number | string;
  reference_number?: string | null;
  transaction_mode?: ContraBankTransactionMode | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  utr_number?: string | null;
  transaction_reference?: string | null;
  instrument_date?: string | null;
  transaction_date?: string | null;
  narration: string;
  attachments?: ContraAttachmentMeta[] | null;
  existing_attachments?: ContraAttachmentMeta[] | null;
}

export interface UpdateContraVoucherPayload extends CreateContraVoucherPayload {
  existing_attachments?: ContraAttachmentMeta[] | null;
}

export interface SubmitContraVoucherPayload {
  approver_id: string;
}

export interface RejectContraVoucherPayload {
  rejection_reason: string;
}

export interface CancelContraVoucherPayload {
  reason: string;
}

export interface ReverseContraVoucherPayload {
  reason: string;
  reversal_date?: string | null;
}

/** Exact whitelist — matches backend `listContraVouchersSchema` sort_by enum. */
export type ContraVoucherListSortBy =
  | "sr_no"
  | "voucher_date"
  | "amount"
  | "status"
  | "from_account_type"
  | "to_account_type"
  | "from_warehouse_name"
  | "to_warehouse_name";

/**
 * List query — mirrors backend `listContraVouchersSchema`.
 */
export interface ContraVoucherListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  financial_year_id?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  status?: ContraVoucherStatus | string;
  from_account_type?: ContraAccountType | string;
  to_account_type?: ContraAccountType | string;
  /** Exact Transfer From Cash ledger ID (when From is Cash). */
  from_cash_ledger_id?: string;
  /** Exact Transfer From Bank Account ID (when From is Bank). */
  from_bank_account_id?: string;
  /** Exact Transfer To Cash ledger ID (when To is Cash). */
  to_cash_ledger_id?: string;
  /** Exact Transfer To Bank Account ID (when To is Bank). */
  to_bank_account_id?: string;
  reference_number?: string;
  from_date?: string;
  to_date?: string;
  sr_no?: number;
  sort_by?: ContraVoucherListSortBy;
  sort_dir?: "asc" | "desc";
}

export interface ContraEligibleAccountsQuery {
  warehouse_id: string;
  page?: number;
  page_size?: number;
  search?: string;
  account_type?: ContraAccountType;
}

export interface ContraEligibleCashAccount {
  account_type: "CASH";
  cash_ledger_id: string;
  ledger_id: string;
  ledger_code: string;
  ledger_name: string;
  alias_name?: string | null;
}

export interface ContraEligibleBankAccount {
  account_type: "BANK";
  bank_account_id: string;
  ledger_id: string;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  branch_name?: string | null;
  ledger_code: string;
  ledger_name: string;
}

export type ContraEligibleAccount =
  | ContraEligibleCashAccount
  | ContraEligibleBankAccount;

export interface ContraEligibleAccountsResponse {
  warehouse_id: string;
  data: ContraEligibleAccount[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ContraLedgerRef {
  ledger_id: string;
  ledger_code?: string | null;
  ledger_name?: string | null;
  source_type?: string | null;
  source_entity_type?: string | null;
}

export interface ContraWarehouseRef {
  warehouse_id: string;
  warehouse_name?: string | null;
}

export interface ContraBankAccountRef {
  bank_account_id: string;
  ledger_id?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  branch_name?: string | null;
}

export interface ContraAccountingLine {
  line_number?: number;
  ledger_id?: string;
  ledger_name?: string | null;
  ledger_code?: string | null;
  entry_type?: string;
  amount?: string | number;
  narration?: string | null;
  warehouse_id?: string | null;
}

export interface ContraAccountingVoucherSummary {
  accounting_voucher_id: string;
  voucher_number?: string | null;
  voucher_type?: string | null;
  voucher_date?: string | null;
  warehouse_id?: string | null;
  status?: string | null;
  total_debit?: string | null;
  total_credit?: string | null;
  lines?: ContraAccountingLine[];
  bank_details?: unknown;
}

export interface ContraVoucherDetail {
  contra_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  financial_year_id?: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  from_account_type: ContraAccountType;
  to_account_type: ContraAccountType;
  from_ledger_id: string;
  to_ledger_id: string;
  from_cash_ledger_id?: string | null;
  to_cash_ledger_id?: string | null;
  from_bank_account_id?: string | null;
  to_bank_account_id?: string | null;
  amount: string | number;
  reference_number?: string | null;
  transaction_mode: ContraBankTransactionMode;
  cheque_number?: string | null;
  cheque_date?: string | null;
  utr_number?: string | null;
  transaction_reference?: string | null;
  instrument_date?: string | null;
  transaction_date?: string | null;
  narration: string;
  attachments?: ContraAttachmentMeta[] | null;
  status: ContraVoucherStatus;
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
  from_warehouse?: ContraWarehouseRef | null;
  to_warehouse?: ContraWarehouseRef | null;
  from_ledger?: ContraLedgerRef | null;
  to_ledger?: ContraLedgerRef | null;
  from_cash_ledger?: ContraLedgerRef | null;
  to_cash_ledger?: ContraLedgerRef | null;
  from_bank_account?: ContraBankAccountRef | null;
  to_bank_account?: ContraBankAccountRef | null;
  from_warehouse_snapshot?: Record<string, unknown> | null;
  to_warehouse_snapshot?: Record<string, unknown> | null;
  from_ledger_snapshot?: Record<string, unknown> | null;
  to_ledger_snapshot?: Record<string, unknown> | null;
  from_cash_ledger_snapshot?: Record<string, unknown> | null;
  to_cash_ledger_snapshot?: Record<string, unknown> | null;
  from_bank_account_snapshot?: Record<string, unknown> | null;
  to_bank_account_snapshot?: Record<string, unknown> | null;
  accounting_voucher?: ContraAccountingVoucherSummary | null;
  reversal_voucher?: {
    accounting_voucher_id: string;
    voucher_number?: string | null;
    voucher_date?: string | null;
    status?: string | null;
  } | null;
}

export interface ContraVoucherListItem {
  contra_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  from_account_type: ContraAccountType;
  to_account_type: ContraAccountType;
  from_ledger_id: string;
  to_ledger_id: string;
  from_cash_ledger_id?: string | null;
  to_cash_ledger_id?: string | null;
  from_bank_account_id?: string | null;
  to_bank_account_id?: string | null;
  amount: string | number;
  reference_number?: string | null;
  narration?: string | null;
  status: ContraVoucherStatus;
  created_at?: string;
  created_by?: string | null;
  from_warehouse?: ContraWarehouseRef | null;
  to_warehouse?: ContraWarehouseRef | null;
  from_ledger?: ContraLedgerRef | null;
  to_ledger?: ContraLedgerRef | null;
}

export interface ContraVoucherListResponse {
  data: ContraVoucherListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export const CONTRA_STATUS_LABELS: Record<ContraVoucherStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
  REVERSED: "Reversed",
};

export const CONTRA_ACCOUNT_TYPE_LABELS: Record<ContraAccountType, string> = {
  CASH: "Cash",
  BANK: "Bank",
};

export const CONTRA_BANK_TRANSACTION_MODE_LABELS: Record<
  ContraBankTransactionMode,
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

/** Modes shown when either side is Bank (CASH mode is invalid for bank sides). */
export const CONTRA_BANK_TRANSACTION_MODES: ContraBankTransactionMode[] = [
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

export const CONTRA_ACCOUNT_TYPES: ContraAccountType[] = ["CASH", "BANK"];
