/** Purchase Register — types for GST / RCM / ITC / GSTR-2B reconciliation. */

export type PurchaseRegisterDocType =
  | "tax_invoice"
  | "bill_of_supply"
  | "debit_note"
  | "credit_note"
  | "bill_of_entry"
  | "self_invoice";

export type PurchaseRegisterPurchaseType =
  | "local"
  | "interstate"
  | "import_goods"
  | "import_services"
  | "sez"
  | "exempt"
  | "nil_rated"
  | "non_gst";

export type PurchaseRegisterRcmFilter = "all" | "applicable" | "not_applicable";

export type PurchaseRegisterItcEligibility =
  | "eligible"
  | "ineligible"
  | "blocked"
  | "partially_eligible"
  | "pending"
  | "reversed";

export type PurchaseRegisterGstr2bStatus =
  | "matched"
  | "partially_matched"
  | "missing_in_2b"
  | "mismatch"
  | "value_mismatch"
  | "tax_mismatch"
  | "invoice_no_mismatch"
  | "date_mismatch"
  | "duplicate"
  | "not_applicable";

export type PurchaseRegisterRcmLiabilityStatus =
  | "not_created"
  | "liability_created"
  | "payment_pending"
  | "paid"
  | "itc_claimed";

export type PurchaseRegisterVoucherStatus = "posted" | "cancelled";

export type PurchaseRegisterSourceKind = "purchase_invoice" | "debit_note";

export interface PurchaseRegisterRow {
  id: string;
  sourceKind: PurchaseRegisterSourceKind;
  sourceId: number;
  purchaseDate: string;
  postingDate: string;
  voucherNumber: string;
  documentType: PurchaseRegisterDocType;
  supplierInvoiceNo: string;
  supplierInvoiceDate: string;
  supplierId: number;
  supplierName: string;
  supplierGstin: string;
  supplierState: string;
  placeOfSupply: string;
  purchaseType: PurchaseRegisterPurchaseType;
  poNumber: string;
  grnNumber: string;
  warehouse: string;
  branch: string;
  hsnSac: string;
  productNames: string[];
  taxableValue: number;
  exemptValue: number;
  nilRatedValue: number;
  nonGstValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  otherCharges: number;
  tdsAmount: number;
  tcsAmount: number;
  roundOff: number;
  totalInvoiceValue: number;
  reverseChargeApplicable: boolean;
  rcmSection: string;
  rcmTaxableValue: number;
  rcmCgst: number;
  rcmSgst: number;
  rcmIgst: number;
  rcmCess: number;
  rcmLiabilityStatus: PurchaseRegisterRcmLiabilityStatus;
  itcEligibility: PurchaseRegisterItcEligibility;
  eligibleItcCgst: number;
  eligibleItcSgst: number;
  eligibleItcIgst: number;
  eligibleItcCess: number;
  ineligibleBlockedItc: number;
  itcReversalAmount: number;
  netItcAvailable: number;
  gstr2bStatus: PurchaseRegisterGstr2bStatus;
  gstr2bReconId: string | null;
  voucherStatus: PurchaseRegisterVoucherStatus;
  /** Linked docs for drill-down */
  poId: number | null;
  grnId: string | null;
  qcId: string | null;
  qcNo: string;
  supplierInvoiceId: string | null;
  linkedDebitNoteId: number | null;
  linkedCreditNoteId: number | null;
  rcmLiabilityVoucherId: number | null;
  postedVoucherId: number | null;
  supplierLedgerId: number | null;
  financialYearId: number;
  isDuplicateSupplierInvoice: boolean;
  createdBy: string;
  postedBy: string;
  modifiedBy: string;
}

export interface PurchaseRegisterFilters {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  branchIds: string[];
  warehouseIds: string[];
  supplierIds: string[];
  supplierGstin: string;
  purchaseTypes: string[];
  documentTypes: string[];
  reverseCharge: PurchaseRegisterRcmFilter;
  itcEligibility: string[];
  gstr2bStatuses: string[];
  voucherStatuses: string[];
  product: string;
  hsnSac: string;
  search: string;
}

export interface PurchaseRegisterTotals {
  count: number;
  taxableValue: number;
  exemptValue: number;
  nilRatedValue: number;
  nonGstValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  rcmTaxableValue: number;
  rcmCgst: number;
  rcmSgst: number;
  rcmIgst: number;
  rcmCess: number;
  eligibleItc: number;
  ineligibleBlockedItc: number;
  itcReversalAmount: number;
  netItcAvailable: number;
  tdsAmount: number;
  tcsAmount: number;
  totalInvoiceValue: number;
}

export const PURCHASE_TYPE_LABELS: Record<PurchaseRegisterPurchaseType, string> = {
  local: "Local Purchase",
  interstate: "Interstate Purchase",
  import_goods: "Import of Goods",
  import_services: "Import of Services",
  sez: "SEZ Purchase",
  exempt: "Exempt Purchase",
  nil_rated: "Nil-Rated Purchase",
  non_gst: "Non-GST Purchase",
};

export const DOCUMENT_TYPE_LABELS: Record<PurchaseRegisterDocType, string> = {
  tax_invoice: "Tax Invoice",
  bill_of_supply: "Bill of Supply",
  debit_note: "Debit Note",
  credit_note: "Credit Note",
  bill_of_entry: "Bill of Entry",
  self_invoice: "Self-Invoice",
};

export const ITC_ELIGIBILITY_LABELS: Record<PurchaseRegisterItcEligibility, string> = {
  eligible: "Eligible",
  ineligible: "Ineligible",
  blocked: "Blocked",
  partially_eligible: "Partially Eligible",
  pending: "Pending",
  reversed: "Reversed",
};

export const GSTR2B_STATUS_LABELS: Record<PurchaseRegisterGstr2bStatus, string> = {
  matched: "Matched",
  partially_matched: "Partially Matched",
  missing_in_2b: "Missing in 2B",
  mismatch: "Mismatch",
  value_mismatch: "Value Mismatch",
  tax_mismatch: "Tax Mismatch",
  invoice_no_mismatch: "Invoice No. Mismatch",
  date_mismatch: "Date Mismatch",
  duplicate: "Duplicate",
  not_applicable: "Not Applicable",
};

export const RCM_LIABILITY_LABELS: Record<PurchaseRegisterRcmLiabilityStatus, string> = {
  not_created: "Not Created",
  liability_created: "Liability Created",
  payment_pending: "Payment Pending",
  paid: "Paid",
  itc_claimed: "ITC Claimed",
};

export const VOUCHER_STATUS_LABELS: Record<PurchaseRegisterVoucherStatus, string> = {
  posted: "Posted",
  cancelled: "Cancelled",
};
