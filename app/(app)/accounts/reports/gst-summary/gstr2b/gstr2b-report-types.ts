import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";

export type Gstr2bDocType = "purchase_invoice" | "credit_note" | "debit_note";

export type Gstr2bMatchStatus =
  | "itc_available"
  | "itc_not_available"
  | "partial_match"
  | "missing_in_gstr2b"
  | "missing_in_books"
  | "needs_review";

export const GSTR2B_STATUS_LABELS: Record<Gstr2bMatchStatus, string> = {
  itc_available: "ITC Available",
  itc_not_available: "ITC Not Available",
  partial_match: "Partial Match",
  missing_in_gstr2b: "Missing in GSTR-2B",
  missing_in_books: "Missing in Books",
  needs_review: "Needs Review",
};

export const GSTR2B_DOC_TYPE_LABELS: Record<Gstr2bDocType, string> = {
  purchase_invoice: "Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export interface Gstr2bPortalDocument {
  id: string;
  supplierName: string;
  supplierGstin: string;
  docType: Gstr2bDocType;
  invoiceNo: string;
  invoiceDate: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** Portal ITC eligibility flag (GSTR-2B itcavl) */
  itcAvailable: boolean;
  isDemo?: boolean;
}

export interface Gstr2bBooksDocument {
  id: string;
  sourceId: number | null;
  supplierName: string;
  supplierGstin: string;
  docType: Gstr2bDocType;
  invoiceNo: string;
  invoiceDate: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  branch: string;
  companyGstin: string;
  ledger?: string;
  isDemo?: boolean;
}

export interface Gstr2bManualOverride {
  rowId: string;
  status: "itc_available" | "needs_review" | null;
  remark: string;
  markedBy: string;
  markedAt: string;
}

export interface Gstr2bReconRow {
  id: string;
  supplierName: string;
  supplierGstin: string;
  docType: Gstr2bDocType;
  booksInvoiceNo: string;
  portalInvoiceNo: string;
  booksInvoiceDate: string;
  portalInvoiceDate: string;
  booksTaxableAmount: number;
  portalTaxableAmount: number;
  booksGst: number;
  portalGst: number;
  booksCgst: number;
  portalCgst: number;
  booksSgst: number;
  portalSgst: number;
  booksIgst: number;
  portalIgst: number;
  taxableDifference: number;
  gstDifference: number;
  difference: number;
  dateMismatch: boolean;
  status: Gstr2bMatchStatus;
  remarks: string;
  booksSourceId: number | null;
  portalDocId: string | null;
  ledger: string;
  itcAvailable: boolean | null;
  isDemo?: boolean;
  systemStatus: Gstr2bMatchStatus;
}

export interface Gstr2bSummaryCounts {
  total: number;
  itcAvailable: number;
  itcNotAvailable: number;
  partialMatch: number;
  missingInGstr2b: number;
  missingInBooks: number;
  needsReview: number;
}

export interface Gstr2bUploadRecord {
  id: string;
  gstin: string;
  returnPeriod: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  version: number;
  isActive: boolean;
  documents: Gstr2bPortalDocument[];
}

export interface Gstr2bReport {
  rows: Gstr2bReconRow[];
  summary: Gstr2bSummaryCounts;
  uploads: Gstr2bUploadRecord[];
  activeUpload: Gstr2bUploadRecord | null;
  hasData: boolean;
}

export type Gstr2bFilters = Pick<
  GstReportFilters,
  "financialYearId" | "gstPeriod" | "branch" | "gstRegistration"
> & {
  dateFrom: string;
  dateTo: string;
};

export const AMOUNT_TOLERANCE = 1;
