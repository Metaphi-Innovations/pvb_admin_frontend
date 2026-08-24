export interface DebitNoteConfig {
  approval_required: boolean;
}

export interface DebitNoteLineInput {
  description: string;
  ledger_id: string;
  product_id?: string | null;
  inventory_detail_id?: string | null;
  hsn_id?: string | null;
  sac_id?: string | null;
  quantity: number | string;
  quantity_type?: string | null;
  rate: number | string;
  taxable_amount: number | string;
  gst_rate: number | string;
  narration?: string | null;
}

export interface DebitNoteReferenceInput {
  reference_type: "PURCHASE_INVOICE" | "PURCHASE_RETURN" | "DIRECT";
  reference_id: string;
  allocated_amount: number | string;
}

export interface CreateDirectDebitNotePayload {
  dn_date: string;
  warehouse_id: string;
  supplier_id: string;
  narration?: string | null;
  remarks?: string | null;
  lines: DebitNoteLineInput[];
  purchase_invoice_id?: string | null;
  allocated_amount?: number | string | null;
  references?: DebitNoteReferenceInput[];
  /** Signed round-off; stored on header and posted to ROUND_OFF ledger when non-zero. */
  round_off_amount?: number | string | null;
}

export interface CreateDebitNoteFromPendingPayload {
  dn_date?: string;
  narration?: string | null;
  remarks?: string | null;
  /** Signed round-off; when omitted backend applies nearest-rupee auto round-off. */
  round_off_amount?: number | string | null;
  /** @deprecated Prefer free-form extra_charges. Kept for older clients. */
  additional_charges?: Array<{
    purchase_return_additional_charge_id: string;
    ledger_id: string;
    amount: number | string;
  }>;
  /** Free-form DN additional charges (Direct-style), posted as DN lines. */
  extra_charges?: Array<{
    description: string;
    ledger_id: string;
    taxable_amount: number | string;
    gst_rate?: number | string;
  }>;
}

export interface UpdateDebitNoteEwayBillPayload {
  eway_bill_number?: string;
  eway_bill_date?: string;
  eway_bill_valid_upto?: string;
  eway_bill_qr_code?: string;
  eway_bill_status?: string;
}

export interface DebitNoteApprovalPayload {
  approver_id: string;
  remarks?: string;
}

export interface DebitNoteCancelPayload {
  reason: string;
}

export interface DebitNoteReversePayload {
  reason: string;
  reversal_date?: string;
}

export interface DebitNoteListQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  supplier_id?: string;
  supplier_ids?: string[];
  warehouse_id?: string;
  warehouse_ids?: string[];
  source_type?: "DIRECT" | "PURCHASE_INVOICE" | "PURCHASE_RETURN";
  source_types?: Array<"DIRECT" | "PURCHASE_INVOICE" | "PURCHASE_RETURN">;
  status?: string;
  dn_number?: string;
  from_date?: string;
  to_date?: string;
}
