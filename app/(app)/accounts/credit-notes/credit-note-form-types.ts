/**
 * Credit Note Generate/Create form types.
 * Shaped from backend Credit Note Prisma models + validation DTOs.
 * Form-local — do not import from list/pending listing modules.
 */

export type CreditNoteSourceType =
  | "DIRECT"
  | "SALES_INVOICE"
  | "SALES_RETURN"
  | "CASH_DISCOUNT"
  | "SPECIAL_SCHEME"
  | "TURNOVER_DISCOUNT"
  | "NEAR_EXPIRY";

export type CreditNoteStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";

export type PendingCreditNoteStatus = "PENDING" | "CONVERTED" | "CANCELLED";

export type CreditNoteCalculationBasis = "AMOUNT" | "QUANTITY" | "DIRECT";

export type DiscountType = "Percentage" | "Flat";

export type CreditNoteReferenceType =
  | "SALES_INVOICE"
  | "SALES_INVOICE_ITEM"
  | "SALES_RETURN"
  | "SALES_RETURN_ITEM"
  | "RECEIPT_VOUCHER"
  | "SCHEME"
  | "INVENTORY_BATCH"
  | "OTHER";

export type CreditNoteReferenceRelationType =
  | "SOURCE"
  | "ELIGIBILITY"
  | "PAYMENT"
  | "RETURN_AGAINST"
  | "INVOICE_AGAINST"
  | "CALCULATION";

export type DirectCnMode = "on_account" | "against_invoice";

export interface NamedRef {
  id?: string;
  code?: string | null;
  name?: string | null;
}

export interface CreditNoteFormCustomer {
  customer_id: string;
  customer_code?: string | null;
  customer_name?: string | null;
}

export interface CreditNoteFormWarehouse {
  warehouse_id: string;
  warehouse_name?: string | null;
  state?: string | null;
}

export interface CreditNoteFormLedger {
  ledger_id: string;
  ledger_code?: string | null;
  ledger_name?: string | null;
  allow_manual_posting?: boolean;
  status?: string | null;
}

export interface CreditNoteFormScheme {
  scheme_id: string;
  scheme_code?: string | null;
  scheme_name?: string | null;
  scheme_type?: string | null;
  settlement_type?: string | null;
  discount_type?: string | null;
  discount_value?: string | number | null;
}

export interface CreditNoteFormFinancialYear {
  financial_year_id: string;
  code?: string | null;
  name?: string | null;
}

export interface CreditNoteFormReference {
  credit_note_reference_id?: string;
  pending_credit_note_reference_id?: string;
  reference_type: CreditNoteReferenceType | string;
  reference_id: string;
  reference_code?: string | null;
  reference_date?: string | null;
  relation_type: CreditNoteReferenceRelationType | string;
  allocated_amount?: string | number | null;
  eligible_amount?: string | number | null;
  quantity?: string | number | null;
  eligible_quantity?: string | number | null;
  reference_snapshot?: Record<string, unknown> | null;
}

export interface CreditNoteFormLine {
  credit_note_line_id?: string;
  pending_credit_note_line_id?: string;
  line_number?: number;
  description: string;
  ledger_id?: string | null;
  ledger?: CreditNoteFormLedger | null;
  ledger_snapshot?: Record<string, unknown> | null;
  product_id?: string | null;
  inventory_detail_id?: string | null;
  product?: { product_id?: string; product_code?: string | null; product_name?: string | null } | null;
  product_snapshot?: Record<string, unknown> | null;
  batch_snapshot?: Record<string, unknown> | null;
  hsn_snapshot?: Record<string, unknown> | null;
  calculation_basis?: CreditNoteCalculationBasis | string | null;
  quantity?: string | number | null;
  eligible_quantity?: string | number | null;
  quantity_type?: string | null;
  eligible_base_amount?: string | number | null;
  discount_type?: DiscountType | string | null;
  discount_value?: string | number | null;
  taxable_amount?: string | number | null;
  taxable_credit_amount?: string | number | null;
  gst_rate?: string | number | null;
  cgst_rate?: string | number | null;
  cgst_amount?: string | number | null;
  sgst_rate?: string | number | null;
  sgst_amount?: string | number | null;
  igst_rate?: string | number | null;
  igst_amount?: string | number | null;
  gst_amount?: string | number | null;
  line_total?: string | number | null;
  narration?: string | null;
  calculation_snapshot?: Record<string, unknown> | null;
}

export interface PendingCreditNoteDetail {
  pending_credit_note_id: string;
  source_type: CreditNoteSourceType | string;
  customer_id: string;
  warehouse_id?: string | null;
  financial_year_id: string;
  scheme_id?: string | null;
  eligibility_key?: string | null;
  eligibility_date?: string | null;
  eligibility_from?: string | null;
  eligibility_to?: string | null;
  calculation_basis?: CreditNoteCalculationBasis | string | null;
  eligible_base_amount?: string | number | null;
  eligible_base_quantity?: string | number | null;
  discount_type?: DiscountType | string | null;
  discount_value?: string | number | null;
  taxable_credit_amount?: string | number | null;
  cgst_amount?: string | number | null;
  sgst_amount?: string | number | null;
  igst_amount?: string | number | null;
  gst_amount?: string | number | null;
  eligible_cn_amount?: string | number | null;
  calculation_summary?: Record<string, unknown> | null;
  status?: PendingCreditNoteStatus | string;
  remarks?: string | null;
  customer_snapshot?: Record<string, unknown> | null;
  warehouse_snapshot?: Record<string, unknown> | null;
  scheme_snapshot?: Record<string, unknown> | null;
  customer?: CreditNoteFormCustomer | null;
  warehouse?: CreditNoteFormWarehouse | null;
  scheme?: CreditNoteFormScheme | null;
  financial_year?: CreditNoteFormFinancialYear | null;
  lines?: CreditNoteFormLine[];
  references?: CreditNoteFormReference[];
  invoice_count?: number;
  invoice_references?: CreditNoteFormReference[];
  receipt_references?: CreditNoteFormReference[];
  sales_return_references?: CreditNoteFormReference[];
  /** Sales Invoice additional charges available when pending is from a Sales Return. */
  sales_return_additional_charges?: Array<{
    sales_invoice_additional_charge_id: string;
    description: string;
    ledger_id: string;
    ledger_name?: string | null;
    original_taxable_amount?: string | number | null;
    original_total_amount?: string | number | null;
    remaining_amount?: string | number | null;
    gst_rate?: string | number | null;
    gst_applicable?: boolean;
  }>;
  credit_note?: {
    credit_note_id: string;
    cn_number?: string | null;
    status?: string | null;
  } | null;
}

export interface CreditNoteDetail {
  credit_note_id: string;
  cn_number?: string | null;
  cn_date?: string | null;
  financial_year_id?: string;
  warehouse_id?: string;
  customer_id?: string;
  party_ledger_id?: string | null;
  source_type?: CreditNoteSourceType | string;
  pending_credit_note_id?: string | null;
  scheme_id?: string | null;
  status?: CreditNoteStatus | string;
  narration?: string | null;
  remarks?: string | null;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  current_approver_id?: string | null;
  taxable_amount?: string | number | null;
  cgst_amount?: string | number | null;
  sgst_amount?: string | number | null;
  igst_amount?: string | number | null;
  gst_amount?: string | number | null;
  round_off_amount?: string | number | null;
  cn_amount?: string | number | null;
  is_interstate?: boolean;
  place_of_supply_state_code?: string | null;
  place_of_supply_snapshot?: Record<string, unknown> | null;
  customer_snapshot?: Record<string, unknown> | null;
  warehouse_snapshot?: Record<string, unknown> | null;
  party_ledger_snapshot?: Record<string, unknown> | null;
  scheme_snapshot?: Record<string, unknown> | null;
  customer?: CreditNoteFormCustomer | null;
  warehouse?: CreditNoteFormWarehouse | null;
  scheme?: CreditNoteFormScheme | null;
  party_ledger?: CreditNoteFormLedger | null;
  financial_year?: CreditNoteFormFinancialYear | null;
  pending_credit_note?: {
    pending_credit_note_id: string;
    eligibility_key?: string | null;
    status?: string | null;
    source_type?: string | null;
    eligible_cn_amount?: string | number | null;
  } | null;
  lines?: CreditNoteFormLine[];
  references?: CreditNoteFormReference[];
}

export interface DirectCnLineInput {
  description: string;
  ledger_id: string;
  product_id?: string | null;
  inventory_detail_id?: string | null;
  hsn_id?: string | null;
  sac_id?: string | null;
  calculation_basis?: CreditNoteCalculationBasis;
  quantity?: number | string | null;
  quantity_type?: string | null;
  eligible_base_amount?: number | string;
  discount_type?: DiscountType | null;
  discount_value?: number | string | null;
  taxable_amount: number | string;
  gst_rate?: number | string;
  narration?: string | null;
}

export interface ReverseCreditNotePayload {
  reason: string;
  reversal_date?: string;
}

export interface CnReferenceInput {
  reference_type: CreditNoteReferenceType;
  reference_id: string;
  reference_code?: string | null;
  reference_date?: string | null;
  relation_type: CreditNoteReferenceRelationType;
  allocated_amount?: number | string | null;
  quantity?: number | string | null;
}

export interface CreateDirectCreditNotePayload {
  cn_date: string;
  warehouse_id: string;
  customer_id: string;
  narration?: string | null;
  remarks?: string | null;
  /** Signed round-off override; when omitted, backend applies auto nearest-rupee. */
  round_off_amount?: number | string | null;
  lines: DirectCnLineInput[];
  references?: CnReferenceInput[];
}

export interface UpdateDraftCreditNotePayload {
  cn_date?: string;
  narration?: string | null;
  remarks?: string | null;
  /** Signed round-off override; when omitted and lines rebuilt, backend auto-rounds. */
  round_off_amount?: number | string | null;
  lines?: DirectCnLineInput[];
  references?: CnReferenceInput[];
}

export interface CreateFromPendingPayload {
  cn_date?: string;
  narration?: string | null;
  remarks?: string | null;
  /** Signed round-off override; when omitted, backend applies auto nearest-rupee. */
  round_off_amount?: number | string | null;
  /** @deprecated Prefer free-form extra_charges. Kept for older clients. */
  additional_charges?: Array<{
    sales_invoice_additional_charge_id: string;
    ledger_id: string;
    amount: number | string;
  }>;
  /** Free-form CN additional charges (Direct-style), posted as CN lines. */
  extra_charges?: Array<{
    description: string;
    ledger_id: string;
    taxable_amount: number | string;
    gst_rate?: number | string;
  }>;
}

export interface CreditNoteApprovalConfig {
  approval_required: boolean;
}

export interface SchemeTypeLedgerMapping {
  scheme_type: string;
  ledger_id?: string;
  is_active?: boolean;
  ledger?: CreditNoteFormLedger | null;
}

export interface DirectLineDraft {
  key: string;
  description: string;
  ledger_id: string;
  ledger_name: string;
  quantity: string;
  rate: string;
  taxable_amount: string;
  gst_applicable: boolean;
  gst_rate: string;
}

export interface EligibleSalesInvoiceItem {
  sales_invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id: string;
  warehouse_id: string;
  invoice_type: string;
  invoice_amount: string | number;
  outstanding_amount: string | number;
  open_item_id: string;
}

export interface EligibleSalesInvoicePagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface EligibleSalesInvoicesResponse {
  customer_id: string;
  party_ledger_id: string;
  items: EligibleSalesInvoiceItem[];
  pagination: EligibleSalesInvoicePagination;
}

export interface EligibleSalesInvoicesQuery {
  search?: string;
  page?: number;
  page_size?: number;
}

export interface InvoiceOption {
  sales_invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number;
  /** Authoritative open-item outstanding from eligible-invoice API. Null if not from that API. */
  outstanding_amount?: number | null;
  customer_id?: string;
  warehouse_id?: string;
  invoice_type?: string;
  open_item_id?: string;
}

export type ParticularColumnKey =
  | "particular"
  | "product"
  | "batch"
  | "expiry"
  | "qty"
  | "eligible_base"
  | "rate_benefit"
  | "ledger"
  | "gst"
  | "cn_amount"
  | "gst_toggle"
  | "gst_rate"
  | "cgst"
  | "sgst"
  | "igst"
  | "actions";
