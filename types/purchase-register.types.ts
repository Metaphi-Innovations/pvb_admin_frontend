/** Purchase Register report types — mirror backend `/accounts/reports/purchase-register` contract. */

export type PurchaseRegisterReportStatus =
  | "POSTED"
  | "CANCELLED"
  | "REVERSED";

export type PurchaseRegisterSourceKind = "purchase_invoice" | "debit_note";

export type PurchaseRegisterInvoiceType =
  | "PURCHASE"
  | "DIRECT_PURCHASE"
  | "STOCK_TRANSFER";

export type PurchaseRegisterPurchaseType = "local" | "interstate";

export type PurchaseRegisterGstr2bSimpleStatus =
  | "matched"
  | "partially_matched"
  | "missing_in_2b"
  | "mismatch"
  | "not_applicable";

export type PurchaseRegisterSupportLevel =
  | "SUPPORTED"
  | "PARTIAL"
  | "NOT_AVAILABLE"
  | "DERIVED_AS_WAREHOUSE";

export type PurchaseRegisterExportFormat = "EXCEL" | "PDF";

export type PurchaseRegisterSortBy =
  | "purchase_date"
  | "voucher_number"
  | "supplier_name"
  | "supplier_invoice_date"
  | "taxable_value"
  | "total_invoice_value";

export type PurchaseRegisterSortOrder = "asc" | "desc";

export interface PurchaseRegisterGstr2bOverlay {
  gstr2b_simple_status: PurchaseRegisterGstr2bSimpleStatus;
  gstr2b_recon_id: string | null;
  match_status: string | null;
  match_method: string | null;
  review_status: string | null;
  portal_itc_availability: string | null;
  pvb_itc_treatment: string | null;
  pvb_itc_claim_period: string | null;
  pvb_itc_claim_cgst: string | null;
  pvb_itc_claim_sgst: string | null;
  pvb_itc_claim_igst: string | null;
  pvb_itc_claim_cess: string | null;
  pvb_itc_claim_total: string | null;
}

export interface PurchaseRegisterApiRow extends PurchaseRegisterGstr2bOverlay {
  id: string;
  source_kind: PurchaseRegisterSourceKind;
  source_id: string;
  purchase_date: string;
  posting_date: string;
  posting_date_is_fallback: boolean;
  voucher_number: string;
  supplier_invoice_number: string | null;
  supplier_invoice_date: string | null;
  supplier: {
    id: string | null;
    name: string;
    gstin: string | null;
    state: string | null;
  };
  recipient_gstin: string | null;
  place_of_supply: {
    code: string | null;
    name: string | null;
  };
  invoice_type: PurchaseRegisterInvoiceType | null;
  debit_note_source_type: string | null;
  purchase_type: PurchaseRegisterPurchaseType | null;
  po: { id: string | null; number: string | null };
  grn: { id: string | null; number: string | null };
  qc_id: string | null;
  branch: { id: string; name: string };
  warehouse: { id: string; name: string };
  hsn_sac: string;
  hsn_sac_unique_count: number;
  product_names: string[];
  reverse_charge_applicable: boolean;
  voucher_status: PurchaseRegisterReportStatus;
  financial_year_id: string;
  is_duplicate_supplier_invoice: boolean;
  created_by: string | null;
  posted_by: string | null;
  modified_by: string | null;
  sign: 1 | -1;
  taxable_value: string;
  cgst: string;
  sgst: string;
  igst: string;
  gst_total: string;
  /** null when NOT_AVAILABLE */
  cess: string | null;
  other_charges: string | null;
  /** null when NOT_AVAILABLE */
  tds_amount: string | null;
  tcs_amount: string | null;
  round_off: string;
  total_invoice_value: string;
}

export interface PurchaseRegisterSummary {
  document_count: number;
  taxable_value: string;
  cgst: string;
  sgst: string;
  igst: string;
  gst_total: string;
  cess: string | null;
  other_charges: string | null;
  tds_amount: string | null;
  tcs_amount: string | null;
  round_off: string;
  total_invoice_value: string;
}

export interface PurchaseRegisterPageSummary {
  document_count: number;
  taxable_value: string;
  cgst: string;
  sgst: string;
  igst: string;
  gst_total: string;
  other_charges: string | null;
  round_off: string;
  total_invoice_value: string;
}

export interface PurchaseRegisterPagination {
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
}

export interface PurchaseRegisterScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  company_name: string;
  branch_ids: string[];
  warehouse_ids: string[];
}

export interface PurchaseRegisterAppliedFilters {
  supplier_ids: string[];
  supplier_gstin: string | null;
  invoice_types: PurchaseRegisterInvoiceType[];
  statuses: PurchaseRegisterReportStatus[];
  gstr2b_statuses: PurchaseRegisterGstr2bSimpleStatus[];
  product_search: string | null;
  hsn_sac: string | null;
  search: string | null;
  sort_by: PurchaseRegisterSortBy;
  sort_order: PurchaseRegisterSortOrder;
}

export interface PurchaseRegisterSupport {
  cess: PurchaseRegisterSupportLevel;
  tds: PurchaseRegisterSupportLevel;
  tcs: PurchaseRegisterSupportLevel;
  rcm: PurchaseRegisterSupportLevel;
  books_itc: PurchaseRegisterSupportLevel;
  exempt_nil_non_gst: PurchaseRegisterSupportLevel;
  document_type: PurchaseRegisterSupportLevel;
  debit_note_gstr2b: PurchaseRegisterSupportLevel;
  branch: PurchaseRegisterSupportLevel;
}

export interface PurchaseRegisterHealth {
  warnings: string[];
}

export interface PurchaseRegisterNotes {
  source: string;
  debit_note_sign: string;
  stock_transfer: string;
  gstr2b: string;
  rcm: string;
  branch: string;
  unsupported: string;
}

export interface PurchaseRegisterReportResult {
  scope: PurchaseRegisterScope;
  applied_filters: PurchaseRegisterAppliedFilters;
  rows: PurchaseRegisterApiRow[];
  summary: PurchaseRegisterSummary;
  page_summary: PurchaseRegisterPageSummary;
  pagination: PurchaseRegisterPagination;
  support: PurchaseRegisterSupport;
  health: PurchaseRegisterHealth;
  notes: PurchaseRegisterNotes;
}

export interface PurchaseRegisterFiltersConfig {
  financial_years: Array<{
    financial_year_id: string;
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
  }>;
  branches: Array<{
    warehouse_id: string;
    warehouse_name: string;
    status: string;
  }>;
  warehouses: Array<{
    warehouse_id: string;
    warehouse_name: string;
    status: string;
  }>;
  suppliers: Array<{
    supplier_id: string;
    supplier_code: string;
    supplier_name: string;
  }>;
  supplier_lookup_endpoint: string;
  invoice_types: Array<{ value: PurchaseRegisterInvoiceType; label: string }>;
  statuses: Array<{ value: PurchaseRegisterReportStatus; label: string }>;
  gstr2b_statuses: Array<{
    value: PurchaseRegisterGstr2bSimpleStatus;
    label: string;
  }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    statuses: PurchaseRegisterReportStatus[];
    invoice_types: PurchaseRegisterInvoiceType[];
    page: number;
    page_size: number;
    sort_by: PurchaseRegisterSortBy;
    sort_order: PurchaseRegisterSortOrder;
  };
}

export interface PurchaseRegisterQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  branch_ids?: string[];
  warehouse_ids?: string[];
  supplier_ids?: string[];
  supplier_gstin?: string;
  invoice_types?: PurchaseRegisterInvoiceType[];
  statuses?: PurchaseRegisterReportStatus[];
  gstr2b_statuses?: PurchaseRegisterGstr2bSimpleStatus[];
  product_search?: string;
  hsn_sac?: string;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: PurchaseRegisterSortBy;
  sort_order?: PurchaseRegisterSortOrder;
}

export interface PurchaseRegisterExportPayload extends PurchaseRegisterQueryParams {
  format: PurchaseRegisterExportFormat;
}
