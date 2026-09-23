import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";
import type {
  Gstr2aMatchStatusApi,
  Gstr2aReviewStatusApi,
} from "@/types/gst-summary.types";

export type Gstr2aDocType = "purchase_invoice" | "credit_note" | "debit_note";

export type Gstr2aMatchStatus =
  | "matched"
  | "partial_match"
  | "missing_in_gstr2a"
  | "missing_in_books"
  | "duplicate"
  | "needs_review";

/** Demo / legacy UI labels (kept for unused demo modules). */
export const GSTR2A_STATUS_LABELS: Record<Gstr2aMatchStatus, string> = {
  matched: "Matched",
  partial_match: "Partial Match",
  missing_in_gstr2a: "Missing in GSTR-2A",
  missing_in_books: "Missing in Books",
  duplicate: "Duplicate",
  needs_review: "Needs Review",
};

/** Backend match_status enum → display labels. */
export const GSTR2A_MATCH_STATUS_LABELS: Record<Gstr2aMatchStatusApi, string> =
  {
    MATCHED: "Matched",
    PARTIAL_MATCH: "Partial Match",
    MISSING_IN_BOOKS: "Missing in Books",
    MISSING_IN_GSTR: "Missing in GSTR-2A",
    DUPLICATE: "Duplicate",
    NEEDS_REVIEW: "Needs Review",
  };

/** Backend review_status enum → display labels. */
export const GSTR2A_REVIEW_STATUS_LABELS: Record<
  Gstr2aReviewStatusApi,
  string
> = {
  PENDING: "Pending",
  MARKED_FOR_REVIEW: "Marked for Review",
  REVIEWED: "Reviewed",
  RESOLVED: "Resolved",
};

/** Short display labels for the reconciliation table. */
export const GSTR2A_DOC_TYPE_LABELS: Record<Gstr2aDocType, string> = {
  purchase_invoice: "Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export interface Gstr2aPortalDocument {
  id: string;
  supplierName: string;
  supplierGstin: string;
  docType: Gstr2aDocType;
  invoiceNo: string;
  invoiceDate: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  isDemo?: boolean;
}

export interface Gstr2aBooksDocument {
  id: string;
  sourceId: number | null;
  supplierName: string;
  supplierGstin: string;
  docType: Gstr2aDocType;
  invoiceNo: string;
  invoiceDate: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  branch: string;
  companyGstin: string;
  /** Purchase ledger / expense GL for comparison drawer */
  ledger?: string;
  isDemo?: boolean;
}

export interface Gstr2aManualOverride {
  rowId: string;
  /** When set, forces status. When null, only remark is applied. */
  status: "matched" | "needs_review" | null;
  remark: string;
  markedBy: string;
  markedAt: string;
}

export interface Gstr2aReconRow {
  id: string;
  supplierName: string;
  supplierGstin: string;
  docType: Gstr2aDocType;
  booksInvoiceNo: string;
  portalInvoiceNo: string;
  booksInvoiceDate: string;
  portalInvoiceDate: string;
  booksTaxableAmount: number;
  portalTaxableAmount: number;
  /** Total GST = CGST + SGST + IGST */
  booksGst: number;
  portalGst: number;
  booksCgst: number;
  portalCgst: number;
  booksSgst: number;
  portalSgst: number;
  booksIgst: number;
  portalIgst: number;
  /** Invoice amount (taxable) difference: books − portal */
  taxableDifference: number;
  /** GST difference: books − portal */
  gstDifference: number;
  /** Combined taxable + GST difference (books − portal) */
  difference: number;
  /** True when books and portal invoice dates differ (and both present) */
  dateMismatch: boolean;
  status: Gstr2aMatchStatus;
  remarks: string;
  booksSourceId: number | null;
  portalDocId: string | null;
  ledger: string;
  isDemo?: boolean;
  systemStatus: Gstr2aMatchStatus;
}

export interface Gstr2aSummaryCounts {
  total: number;
  matched: number;
  partialMatch: number;
  missingInGstr2a: number;
  missingInBooks: number;
  duplicate: number;
  needsReview: number;
}

export interface Gstr2aUploadRecord {
  id: string;
  gstin: string;
  returnPeriod: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  version: number;
  isActive: boolean;
  documents: Gstr2aPortalDocument[];
}

export interface Gstr2aReport {
  rows: Gstr2aReconRow[];
  summary: Gstr2aSummaryCounts;
  uploads: Gstr2aUploadRecord[];
  activeUpload: Gstr2aUploadRecord | null;
  hasData: boolean;
}

export type Gstr2aFilters = Pick<
  GstReportFilters,
  "financialYearId" | "gstPeriod" | "branch" | "gstRegistration"
> & {
  dateFrom: string;
  dateTo: string;
};

export const AMOUNT_TOLERANCE = 1;
