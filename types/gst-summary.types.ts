/**
 * GST Summary + GSTR-1 types — mirror backend
 * `/accounts/reports/gst-summary` contract (snake_case money strings).
 */

export type Gstr1SectionId =
  | "b2b"
  | "b2c"
  | "b2c-large"
  | "b2c-small"
  | "cn-dn-registered"
  | "cn-dn-unregistered"
  | "hsn-summary"
  | "documents-summary"
  | "export-sez"
  | "nil-exempt-non-gst"
  | "grand-total";

export type Gstr1SortBy =
  | "document_date"
  | "document_number"
  | "customer_name"
  | "taxable_amount"
  | "gst_amount";

export type Gstr1SortOrder = "asc" | "desc";

export interface GstSummaryScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  company_name: string;
  branch_ids: string[];
  warehouse_ids: string[];
  gstin: string | null;
}

export interface GstSummaryAppliedFilters {
  gst_period: string | null;
  gstin: string | null;
  branch_ids: string[];
  warehouse_ids: string[];
}

export interface GstSummaryHealth {
  warnings: string[];
  codes: string[];
}

export interface GstOverviewDocumentCounts {
  sales_invoices: number;
  credit_notes: number;
  purchase_invoices: number;
  debit_notes: number;
  stock_transfer_sales: number;
  stock_transfer_purchases: number;
}

export interface GstOverviewKpis {
  taxable_sales: string;
  taxable_purchases: string;
  output_cgst: string;
  output_sgst: string;
  output_igst: string;
  output_gst: string;
  input_cgst: string;
  input_sgst: string;
  input_igst: string;
  input_gst: string;
  eligible_itc: string | null;
  eligible_itc_available: boolean;
  net_gst_payable: string | null;
  net_gst_payable_available: boolean;
  books_gst_working_difference: string;
  pending_reconciliation: number | null;
  pending_reconciliation_available: boolean;
  document_counts: GstOverviewDocumentCounts;
}

export interface GstOverviewMonthlyRow {
  month_key: string;
  month: string;
  taxable_sales: string;
  taxable_purchases: string;
  output_cgst: string;
  output_sgst: string;
  output_igst: string;
  output_gst: string;
  input_cgst: string;
  input_sgst: string;
  input_igst: string;
  input_gst: string;
  books_gst_working_difference: string;
  sales: string;
  purchase: string;
  outputGst: string;
  inputGst: string;
  /** Books-only alias — not statutory Net GST Payable. */
  netGst: string;
  row_type: "line" | "total";
}

export interface GstSummaryFiltersConfig {
  financial_years: Array<{
    financial_year_id: string;
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
  }>;
  gst_periods: Array<{ value: string; label: string }>;
  branches: Array<{
    warehouse_id: string;
    warehouse_name: string;
    status: string;
    gst_number: string | null;
  }>;
  warehouses: Array<{
    warehouse_id: string;
    warehouse_name: string;
    status: string;
    gst_number: string | null;
  }>;
  gst_registrations: Array<{
    gstin: string;
    label: string;
    registered_legal_name: string | null;
    warehouse_ids: string[];
    warehouse_names: string[];
  }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    gst_period: null;
    gstin: null;
  };
}

export interface GstSummaryOverviewResult {
  scope: GstSummaryScope;
  applied_filters: GstSummaryAppliedFilters;
  summary: GstOverviewKpis;
  monthly_summary: GstOverviewMonthlyRow[];
  health: GstSummaryHealth;
  notes: {
    source: string;
    stock_transfer: string;
    missing_warehouse_gstin: string;
    eligible_itc: string;
    net_payable: string;
    monthly_net_gst: string;
    reconciliation: string;
    unsupported_classification: string;
    rounding: string;
  };
  datasets?: {
    outward_count: number;
    inward_count: number;
  };
}

export interface Gstr1SectionMoneyTotals {
  document_count: number;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  gst_amount: string;
  invoice_amount: string;
}

export interface Gstr1HubSectionRow extends Gstr1SectionMoneyTotals {
  section_id: Gstr1SectionId;
  particulars: string;
  supported: boolean;
  row_type: "section" | "supporting" | "total" | "unsupported";
  notes: string | null;
}

export interface Gstr1HubResult {
  scope: GstSummaryScope;
  applied_filters: GstSummaryAppliedFilters;
  header: {
    company_name: string;
    report_name: string;
    gstin: string | null;
    financial_year: string | null;
    return_period: string | null;
    filing_status: string;
  };
  voucher_summary: {
    total_outward_documents: number;
    included_in_return: number;
    needs_review: number;
    quarantined: number;
  };
  sections: Gstr1HubSectionRow[];
  unsupported_sections: Array<{
    section_id: Gstr1SectionId;
    reason: string;
  }>;
  health: GstSummaryHealth;
  notes: {
    source: string;
    b2c_threshold: string;
    unsupported: string;
    debit_notes: string;
  };
}

export interface Gstr1DocumentRow {
  id: string;
  source_id: string;
  source_type: string;
  document_number: string;
  document_date: string;
  invoice_type: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_gstin: string | null;
  place_of_supply_state_code: string | null;
  warehouse_id: string;
  warehouse_gstin: string | null;
  is_interstate: boolean;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  gst_amount: string;
  total_amount: string;
  source_status: string;
  taxable_reduction?: string;
  cgst_reduction?: string;
  sgst_reduction?: string;
  igst_reduction?: string;
  gst_reduction?: string;
  original_invoice_number: string | null;
  original_invoice_date: string | null;
  original_invoice_id: string | null;
  health_flags: string[];
  needs_review: boolean;
}

export interface Gstr1HsnRow {
  id: string;
  hsn_sac_code: string;
  description: string | null;
  uqc: string | null;
  gst_rate: string;
  quantity: string;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  gst_amount: string;
}

export interface Gstr1DocumentIssuedRow {
  id: string;
  document_type: "SALES_INVOICE" | "CREDIT_NOTE";
  document_type_label: string;
  from_number: string | null;
  to_number: string | null;
  total_issued: number;
  cancelled: number;
  net_issued: number;
  serial_range_reliable: boolean;
}

export interface Gstr1SectionResult {
  scope: GstSummaryScope;
  applied_filters: GstSummaryAppliedFilters & {
    section_id: Gstr1SectionId;
    sort_by: Gstr1SortBy;
    sort_order: Gstr1SortOrder;
  };
  section_id: Gstr1SectionId;
  supported: boolean;
  unsupported_reason: string | null;
  summary: Gstr1SectionMoneyTotals;
  rows: Gstr1DocumentRow[] | Gstr1HsnRow[] | Gstr1DocumentIssuedRow[];
  page_summary: Gstr1SectionMoneyTotals;
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
  health: GstSummaryHealth;
  notes: Record<string, string>;
}

export interface GstSummaryQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  gst_period?: string;
  branch_ids?: string[];
  warehouse_ids?: string[];
  gstin?: string;
}

export interface Gstr1SectionQueryParams extends GstSummaryQueryParams {
  page?: number;
  page_size?: number;
  sort_by?: Gstr1SortBy;
  sort_order?: Gstr1SortOrder;
}

/* ─────────── GSTR-2A (backend contract) ─────────── */

export type Gstr2aMatchStatusApi =
  | "MATCHED"
  | "PARTIAL_MATCH"
  | "MISSING_IN_BOOKS"
  | "MISSING_IN_GSTR"
  | "DUPLICATE"
  | "NEEDS_REVIEW";

export type Gstr2aReviewStatusApi =
  | "PENDING"
  | "MARKED_FOR_REVIEW"
  | "REVIEWED"
  | "RESOLVED";

export type Gstr2aMatchMethodApi =
  | "AUTO"
  | "UNMATCHED"
  | "MANUAL"
  | "MANUAL_ACCEPTED"
  | "CARRIED_FORWARD";

export interface Gstr2aImportDto {
  import_id: string;
  statement_type: string;
  gstin: string;
  return_period: string;
  financial_year_id: string;
  source: string;
  original_file_name: string | null;
  mime_type: string | null;
  file_hash: string | null;
  file_size_bytes: number | null;
  import_status: string;
  is_current: boolean;
  supersedes_import_id: string | null;
  version_no: number;
  total_records: number;
  processed_records: number;
  invalid_records: number;
  duplicate_records: number;
  error_message: string | null;
  error_details: unknown;
  warehouse_ids_snapshot: unknown;
  imported_by: string | null;
  imported_at: string;
}

export interface Gstr2aImportListResult {
  rows: Gstr2aImportDto[];
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
}

export interface Gstr2aImportUploadResult {
  duplicate_file: boolean;
  import: Gstr2aImportDto;
  previous_import: Gstr2aImportDto | null;
  reconciliation?: {
    ok: boolean;
    result?: unknown;
    error?: string;
  } | null;
}

export type GstPortalItcAvailabilityApi =
  | "AVAILABLE"
  | "NOT_AVAILABLE"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export type GstPvbItcTreatmentApi =
  | "TO_REVIEW"
  | "ELIGIBLE_TO_CLAIM"
  | "HOLD"
  | "INELIGIBLE"
  | "REVERSAL_REQUIRED"
  | "CLAIMED"
  | "NOT_APPLICABLE";

export interface Gstr2aPortalRecordDto {
  record_id: string;
  import_id: string;
  document_category: string;
  portal_section: string | null;
  supplier_gstin: string | null;
  supplier_trade_name: string | null;
  supplier_legal_name: string | null;
  document_number: string | null;
  document_number_normalized: string | null;
  document_date: string | null;
  place_of_supply: string | null;
  is_reverse_charge: boolean | null;
  taxable_value: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  cess_amount: string;
  gst_amount: string;
  document_value: string | null;
  portal_itc_availability: string;
  portal_itc_unavailable_reason?: string | null;
  fingerprint: string;
}

export interface Gstr2aPortalRecordsResult {
  import: Gstr2aImportDto | null;
  rows: Gstr2aPortalRecordDto[];
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
}

export interface Gstr2aReconSummaryDto {
  total: number;
  matched: number;
  partial_match: number;
  missing_in_books: number;
  missing_in_gstr: number;
  duplicate: number;
  needs_review: number;
  books_taxable: string;
  portal_taxable: string;
  taxable_difference: string;
  books_gst: string;
  portal_gst: string;
  gst_difference: string;
  /** GSTR-2B only — portal ITC counts/amounts over full filtered set */
  portal_itc_available_count?: number;
  portal_itc_not_available_count?: number;
  portal_itc_available_amount?: string;
  portal_itc_not_available_amount?: string;
  pvb_to_review_amount?: string;
  pvb_eligible_to_claim_amount?: string;
  pvb_hold_amount?: string;
  pvb_ineligible_amount?: string;
  pvb_reversal_required_amount?: string;
  pvb_claimed_amount?: string;
  claim_amount_basis?: string;
  itc_amount_notes?: string;
}

export interface Gstr2aReconCombinedRowDto {
  reconciliation_item_id: string;
  import_id: string;
  supplier: {
    supplier_gstin: string | null;
    portal_supplier_name: string | null;
    books_supplier_name: string | null;
  };
  books: {
    purchase_invoice_id: string;
    books_invoice_number: string;
    books_internal_number: string;
    books_invoice_date: string | null;
    books_taxable: string;
    books_cgst: string;
    books_sgst: string;
    books_igst: string;
    books_gst: string;
  } | null;
  portal: {
    gst_statement_record_id: string;
    portal_invoice_number: string | null;
    portal_invoice_date: string | null;
    portal_taxable: string;
    portal_cgst: string;
    portal_sgst: string;
    portal_igst: string;
    portal_cess: string;
    portal_gst: string;
    portal_itc_availability?: string | null;
    portal_itc_unavailable_reason?: string | null;
  } | null;
  differences: {
    date_mismatch: boolean;
    taxable_difference: string | null;
    cgst_difference: string | null;
    sgst_difference: string | null;
    igst_difference: string | null;
    cess_difference: string | null;
    gst_difference: string | null;
  };
  status: {
    match_status: Gstr2aMatchStatusApi;
    review_status: Gstr2aReviewStatusApi;
    match_method: Gstr2aMatchMethodApi;
  };
  workflow: {
    remarks: string | null;
    manual_reason: string | null;
  };
  pvb_itc_treatment: string;
  /** GSTR-2B list rows (includeItcFields) */
  portal_itc_availability?: string | null;
  portal_itc_unavailable_reason?: string | null;
  pvb_itc_claim_igst?: string | null;
  pvb_itc_claim_cgst?: string | null;
  pvb_itc_claim_sgst?: string | null;
  pvb_itc_claim_cess?: string | null;
  pvb_itc_claim_total?: string | null;
  pvb_itc_claim_period?: string | null;
  pvb_itc_decided_by?: string | null;
  pvb_itc_decided_at?: string | null;
}

export type Gstr2bReconCombinedRowDto = Gstr2aReconCombinedRowDto;
export type Gstr2bReconSummaryDto = Gstr2aReconSummaryDto;
export type Gstr2bImportDto = Gstr2aImportDto;
export type Gstr2bPortalRecordDto = Gstr2aPortalRecordDto;
export type Gstr2bReconciliationListResult = Gstr2aReconciliationListResult;
export type Gstr2bReconDetailDto = Gstr2aReconDetailDto;

export interface Gstr2bItcTreatmentBody {
  pvb_itc_treatment: Exclude<GstPvbItcTreatmentApi, "NOT_APPLICABLE">;
  reason?: string | null;
  claim_period?: string | null;
  claim_igst?: string | null;
  claim_cgst?: string | null;
  claim_sgst?: string | null;
  claim_cess?: string | null;
  claim_total?: string | null;
}

export interface Gstr2aReconciliationListResult {
  import: {
    import_id: string;
    gstin: string;
    return_period: string;
    version_no: number;
    is_current: boolean;
    import_status: string;
    financial_year_id: string;
  } | null;
  no_current_import: boolean;
  read_only_historical?: boolean;
  tolerance?: string;
  deferred_portal_categories?: {
    credit_note: number;
    debit_note: number;
    amendment: number;
    other: number;
  } | null;
  summary: Gstr2aReconSummaryDto | null;
  rows: Gstr2aReconCombinedRowDto[];
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
}

export interface Gstr2aAuditRowDto {
  audit_id: string;
  action: string;
  previous_match_status: string | null;
  new_match_status: string | null;
  previous_review_status: string | null;
  new_review_status: string | null;
  previous_purchase_invoice_id: string | null;
  new_purchase_invoice_id: string | null;
  reason: string | null;
  event_data: unknown;
  performed_by: string | null;
  performed_at: string;
}

export interface Gstr2aReconDetailDto {
  reconciliation_item_id: string;
  import_id: string;
  is_active: boolean;
  import?: {
    is_current: boolean;
    version_no: number;
    gstin: string;
    return_period: string;
  };
  portal: Record<string, unknown> | null;
  books: Record<string, unknown> | null;
  comparison: Record<string, unknown>;
  workflow: Record<string, unknown>;
  recent_audit?: Gstr2aAuditRowDto[];
}

export interface Gstr2aCandidateRowDto {
  purchase_invoice_id: string;
  supplier_name: string | null;
  supplier_gstin: string | null;
  supplier_invoice_number: string;
  supplier_invoice_date: string;
  purchase_type: string;
  warehouse_gstin: string | null;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  gst_amount: string;
  invoice_amount: string;
  already_linked_to_item_id: string | null;
  is_current_link: boolean;
  comparison: {
    gstin_match: boolean;
    document_number_match: boolean;
    date_match: boolean;
    taxable_difference: string | null;
    cgst_difference: string | null;
    sgst_difference: string | null;
    igst_difference: string | null;
    gst_difference: string | null;
  };
  rank_score: number;
}

export interface Gstr2aCandidatesResult {
  reconciliation_item_id: string;
  portal: Record<string, unknown>;
  tolerance: string;
  rows: Gstr2aCandidateRowDto[];
  pagination: {
    page: number;
    page_size: number;
    total_rows: number;
    total_pages: number;
  };
}

export interface Gstr2aReconRunResult {
  import_id: string;
  gstin: string;
  return_period: string;
  version_no: number;
  deferred_portal_categories: Record<string, number>;
  tolerance: string;
  summary: Gstr2aReconSummaryDto;
  carry_forward_applied: number;
  carry_forward_note: string;
}

export interface Gstr2aReconListQuery {
  financial_year_id?: string;
  gstin?: string;
  return_period?: string;
  import_id?: string;
  match_status?: string;
  review_status?: string;
  supplier_gstin?: string;
  document_number?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

/* ── GSTR-3B V1 working report (mirrors backend gstr3b.types) ── */

export type Gstr3bSupportStatus =
  | "SUPPORTED"
  | "PARTIAL"
  | "NOT_AVAILABLE"
  | "NOT_IMPLEMENTED_IN_V1";

export interface Gstr3bMoneyBreakup {
  taxable_value: string | null;
  igst: string | null;
  cgst: string | null;
  sgst: string | null;
  cess: string | null;
  gst_total: string | null;
}

export interface Gstr3bItcBreakup {
  igst: string;
  cgst: string;
  sgst: string;
  cess: string;
  total: string;
  row_count: number;
  amount_basis: "explicit" | "provisional_portal_gst" | "mixed" | null;
  notes: string | null;
}

export interface Gstr3bBucket<T = unknown> {
  support: Gstr3bSupportStatus;
  reason: string | null;
  values: T | null;
}

export interface Gstr3bSection31aValues extends Gstr3bMoneyBreakup {
  document_count: number;
  sales_invoice_count: number;
  credit_note_count: number;
  stock_transfer_sales_count: number;
  ambiguous_zero_tax_excluded_count: number;
}

export interface Gstr3bSection4AllOtherValues {
  suggested_eligible_itc: Gstr3bItcBreakup;
  final_claimed_itc: Gstr3bItcBreakup;
}

export interface Gstr3bSection4NetWorkingValues {
  suggested_net_itc_working: Gstr3bItcBreakup;
  final_claimed_itc_working: Gstr3bItcBreakup;
  note: string;
}

export interface Gstr3bBooksControlValues {
  label: "NON_STATUTORY_CONTROL";
  output_cgst: string;
  output_sgst: string;
  output_igst: string;
  output_gst: string;
  input_cgst: string;
  input_sgst: string;
  input_igst: string;
  input_gst: string;
  books_gst_working_difference: string;
  note: string;
}

export interface Gstr3bGstr2bControlValues {
  label: "WORKFLOW_CONTROL";
  import_id: string | null;
  version_no: number | null;
  portal_itc_available_count: number;
  portal_itc_not_available_count: number;
  to_review_count: number;
  hold_count: number;
  ineligible_count: number;
  eligible_to_claim_count: number;
  claimed_count: number;
  reversal_required_count: number;
  note: string;
}

export interface Gstr3bSupportMatrixRow {
  bucket: string;
  support: Gstr3bSupportStatus;
  reason: string | null;
}

export interface Gstr3bWorkingResult {
  scope: {
    financial_year_id: string;
    financial_year_code: string | null;
    financial_year_name: string | null;
    from_date: string;
    to_date: string;
    gstin: string;
    return_period: string;
    company_name: string;
  };
  applied_filters: {
    gst_period: string;
    gstin: string;
    branch_ids: string[];
    warehouse_ids: string[];
  };
  section_3_1: {
    a: Gstr3bBucket<Gstr3bSection31aValues>;
    b: Gstr3bBucket;
    c: Gstr3bBucket;
    d: Gstr3bBucket;
    e: Gstr3bBucket;
  };
  section_3_1_1: Gstr3bBucket;
  section_3_2: {
    unregistered: Gstr3bBucket;
    composition: Gstr3bBucket;
    uin: Gstr3bBucket;
  };
  section_4: {
    available: {
      import_goods: Gstr3bBucket;
      import_services: Gstr3bBucket;
      rcm: Gstr3bBucket;
      isd: Gstr3bBucket;
      all_other_itc: Gstr3bBucket<Gstr3bSection4AllOtherValues>;
    };
    reversal: Gstr3bBucket;
    net_working: Gstr3bBucket<Gstr3bSection4NetWorkingValues>;
    other_details: Gstr3bBucket;
  };
  section_5: {
    interstate_exempt: Gstr3bBucket;
    interstate_nil: Gstr3bBucket;
    interstate_non_gst: Gstr3bBucket;
    intrastate_exempt: Gstr3bBucket;
    intrastate_nil: Gstr3bBucket;
    intrastate_non_gst: Gstr3bBucket;
  };
  books_control: Gstr3bBucket<Gstr3bBooksControlValues>;
  gstr2b_control: Gstr3bBucket<Gstr3bGstr2bControlValues>;
  tax_payment_utilization: Gstr3bBucket;
  support_matrix: Gstr3bSupportMatrixRow[];
  health: {
    codes: string[];
    warnings: string[];
  };
  notes: Record<string, string>;
}

export type Gstr3bQueryParams = GstSummaryQueryParams & {
  /** Required YYYY-MM — same as gst_period for GSTR-3B. */
  return_period: string;
};

/** Annual GST Compliance Summary — FY + GSTIN scoped. Not GSTR-9 / not filing. */
export type AnnualSupportStatus =
  | "SUPPORTED"
  | "PARTIAL"
  | "NOT_AVAILABLE"
  | "NOT_IMPLEMENTED_IN_V1"
  | "MISSING"
  | "READY";

export interface AnnualBucket<T = unknown> {
  support: AnnualSupportStatus;
  reason: string | null;
  values: T | null;
}

export interface AnnualItcBreakup {
  igst: string;
  cgst: string;
  sgst: string;
  cess: string;
  total: string;
  row_count: number;
  amount_basis: "explicit" | "provisional_portal_gst" | "mixed" | null;
  notes: string | null;
  imported_period_count: number;
  missing_period_count: number;
}

export interface AnnualPeriodStatuses {
  return_period: string;
  label: string;
  gstr1: AnnualSupportStatus;
  gstr2a: AnnualSupportStatus;
  gstr2b: AnnualSupportStatus;
  gstr3b: AnnualSupportStatus;
  notes: string | null;
}

export interface AnnualGstr1SectionRow {
  section_id: string;
  particulars: string;
  support: AnnualSupportStatus;
  reason: string | null;
  document_count: number | null;
  taxable_amount: string | null;
  igst_amount: string | null;
  cgst_amount: string | null;
  sgst_amount: string | null;
  gst_amount: string | null;
}

export interface AnnualReconCounts {
  matched: number;
  partial_match: number;
  missing_in_books: number;
  missing_in_gstr: number;
  duplicate: number;
  needs_review: number;
  unresolved_review: number;
  total_items: number;
}

export interface AnnualWorkingResult {
  product: {
    name: string;
    subtitle: string;
    is_filing_module: false;
    is_gstr9: false;
  };
  scope: {
    financial_year_id: string;
    financial_year_code: string | null;
    financial_year_name: string | null;
    from_date: string;
    to_date: string;
    gstin: string;
    company_name: string;
    return_periods: string[];
  };
  applied_filters: {
    gstin: string;
    branch_ids: string[];
    warehouse_ids: string[];
  };
  period_matrix: AnnualPeriodStatuses[];
  headline: AnnualBucket<{
    annual_outward_taxable: string;
    annual_output_gst: string;
    suggested_eligible_itc_total: string | null;
    suggested_eligible_itc_support: AnnualSupportStatus;
    final_claimed_itc_total: string | null;
    final_claimed_itc_support: AnnualSupportStatus;
    books_gst_working_difference: string;
  }>;
  outward: AnnualBucket<{
    taxable_value: string;
    igst: string;
    cgst: string;
    sgst: string;
    cess: string | null;
    gst_total: string;
    document_count: number;
    credit_note_count: number;
    stock_transfer_sales_count: number;
    ambiguous_zero_tax_excluded_count: number;
  }>;
  gstr1: AnnualBucket<{ sections: AnnualGstr1SectionRow[] }>;
  gstr2a: AnnualBucket<{
    imported_period_count: number;
    missing_period_count: number;
    counts: AnnualReconCounts;
    portal_gst_total: string | null;
    books_gst_total: string | null;
    note: string;
  }>;
  gstr2b: AnnualBucket<{
    imported_period_count: number;
    missing_period_count: number;
    portal_itc_available_count: number;
    portal_itc_not_available_count: number;
    portal_itc_unknown_count: number;
    counts: AnnualReconCounts;
    to_review_count: number;
    eligible_to_claim_count: number;
    hold_count: number;
    ineligible_count: number;
    reversal_required_count: number;
    claimed_count: number;
    note: string;
  }>;
  gstr3b_working: {
    section_3_1_a: AnnualBucket<{
      taxable_value: string;
      igst: string;
      cgst: string;
      sgst: string;
      cess: string | null;
      gst_total: string;
      document_count: number;
    }>;
    suggested_eligible_itc: AnnualBucket<AnnualItcBreakup>;
    final_claimed_itc: AnnualBucket<AnnualItcBreakup>;
    unsupported: AnnualBucket;
  };
  books_control: AnnualBucket<{
    label: "NON_STATUTORY_CONTROL";
    output_cgst: string;
    output_sgst: string;
    output_igst: string;
    output_gst: string;
    input_cgst: string;
    input_sgst: string;
    input_igst: string;
    input_gst: string;
    books_gst_working_difference: string;
    note: string;
  }>;
  tax_payment_filing: AnnualBucket;
  health: {
    codes: string[];
    warnings: string[];
    missing_gstr2a_periods: string[];
    missing_gstr2b_periods: string[];
    unresolved_reconciliation_count: number;
    missing_in_books_count: number;
    missing_in_gstr_count: number;
    itc_to_review_count: number;
    itc_hold_count: number;
    itc_ineligible_count: number;
    reversal_required_workflow_count: number;
    ambiguous_zero_tax_quarantine_count: number;
    parser_confidence: "LOW";
  };
  support_matrix: Array<{
    bucket: string;
    support: AnnualSupportStatus;
    reason: string | null;
  }>;
  notes: Record<string, string>;
}

export type AnnualWorkingQueryParams = {
  financial_year_id: string;
  gstin: string;
  branch_ids?: string[];
  warehouse_ids?: string[];
};
