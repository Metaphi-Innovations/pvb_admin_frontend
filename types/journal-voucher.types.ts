/** Journal Voucher API types — aligned with backend JournalVoucher module. */

export type JournalVoucherStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";

export interface JournalVoucherConfig {
  approval_required: boolean;
}

export interface JournalAttachmentMeta {
  file_name: string;
  file_url: string;
  file_type?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
}

export interface JournalPendingFile {
  id: string;
  file: File;
  /** Temporary object URL for local preview only; never persisted/submitted. */
  previewUrl: string;
}

export interface CreateJournalVoucherPayload {
  voucher_date: string;
  warehouse_id: string;
  debit_ledger_id: string;
  credit_ledger_id: string;
  amount: number | string;
  reference_number?: string | null;
  narration: string;
  attachments?: JournalAttachmentMeta[] | null;
  existing_attachments?: JournalAttachmentMeta[] | null;
}

export interface UpdateJournalVoucherPayload extends CreateJournalVoucherPayload {
  existing_attachments?: JournalAttachmentMeta[] | null;
}

export interface SubmitJournalVoucherPayload {
  approver_id: string;
}

export interface RejectJournalVoucherPayload {
  rejection_reason: string;
}

export interface CancelJournalVoucherPayload {
  reason: string;
}

export interface ReverseJournalVoucherPayload {
  reason: string;
  reversal_date?: string | null;
}

export interface JournalVoucherListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  financial_year_id?: string;
  warehouse_id?: string;
  status?: string;
  debit_ledger_id?: string;
  credit_ledger_id?: string;
  debit_ledger_names?: string;
  credit_ledger_names?: string;
  reference_number?: string;
  from_date?: string;
  to_date?: string;
  sr_no?: number;
  sort_by?:
    | "sr_no"
    | "voucher_date"
    | "amount"
    | "reference_number"
    | "status"
    | "debit_ledger"
    | "credit_ledger"
    | "created_at";
  sort_dir?: "asc" | "desc";
  amount_min?: number;
  amount_max?: number;
}

export interface JournalEligibleLedgersQuery {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface JournalEligibleLedger {
  ledger_id: string;
  ledger_code: string;
  ledger_name: string;
  alias_name?: string | null;
  allow_manual_posting?: boolean;
  source_type?: string | null;
  source_entity_type?: string | null;
  system_ledger_type?: string | null;
  account_sub_group?: {
    account_sub_group_id?: string;
    code?: string | null;
    name?: string | null;
  } | null;
}

export interface JournalEligibleLedgersResponse {
  data: JournalEligibleLedger[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface JournalLedgerRef {
  ledger_id: string;
  ledger_code?: string | null;
  ledger_name?: string | null;
  source_type?: string | null;
  source_entity_type?: string | null;
  system_ledger_type?: string | null;
  allow_manual_posting?: boolean | null;
}

export interface JournalWarehouseRef {
  warehouse_id: string;
  warehouse_name?: string | null;
}

export interface JournalAccountingLine {
  line_number?: number;
  ledger_id?: string;
  ledger_name?: string | null;
  ledger_code?: string | null;
  entry_type?: string;
  amount?: string | number;
  narration?: string | null;
}

export interface JournalAccountingVoucherSummary {
  accounting_voucher_id: string;
  voucher_number?: string | null;
  voucher_type?: string | null;
  voucher_date?: string | null;
  status?: string | null;
  total_debit?: string | null;
  total_credit?: string | null;
  lines?: JournalAccountingLine[];
}

export interface JournalVoucherDetail {
  journal_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  financial_year_id?: string;
  warehouse_id: string;
  debit_ledger_id: string;
  credit_ledger_id: string;
  amount: string | number;
  reference_number?: string | null;
  narration: string;
  attachments?: JournalAttachmentMeta[] | null;
  status: JournalVoucherStatus;
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
  warehouse?: JournalWarehouseRef | null;
  debit_ledger?: JournalLedgerRef | null;
  credit_ledger?: JournalLedgerRef | null;
  warehouse_snapshot?: Record<string, unknown> | null;
  debit_ledger_snapshot?: Record<string, unknown> | null;
  credit_ledger_snapshot?: Record<string, unknown> | null;
  accounting_voucher?: JournalAccountingVoucherSummary | null;
  reversal_voucher?: {
    accounting_voucher_id: string;
    voucher_number?: string | null;
    voucher_date?: string | null;
    status?: string | null;
  } | null;
}

export interface JournalVoucherListItem {
  journal_voucher_id: string;
  sr_no: string | number | bigint;
  voucher_date: string;
  warehouse_id: string;
  debit_ledger_id: string;
  credit_ledger_id: string;
  amount: string | number;
  reference_number?: string | null;
  narration?: string | null;
  status: JournalVoucherStatus;
  created_at?: string;
  created_by?: string | null;
  warehouse?: JournalWarehouseRef | null;
  debit_ledger?: JournalLedgerRef | null;
  credit_ledger?: JournalLedgerRef | null;
  debit_ledger_snapshot?: Record<string, unknown> | null;
  credit_ledger_snapshot?: Record<string, unknown> | null;
}

export interface JournalVoucherListResponse {
  data: JournalVoucherListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export const JOURNAL_STATUS_LABELS: Record<JournalVoucherStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
  REVERSED: "Reversed",
};
