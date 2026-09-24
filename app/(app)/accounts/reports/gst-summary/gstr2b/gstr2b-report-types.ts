import type { GstReportFilters } from "@/lib/accounts/gst-report-filters";
import type {
  Gstr2aMatchStatusApi,
  Gstr2aReviewStatusApi,
  GstPortalItcAvailabilityApi,
  GstPvbItcTreatmentApi,
} from "@/types/gst-summary.types";

/** Backend match_status enum → GSTR-2B display labels. */
export const GSTR2B_MATCH_STATUS_LABELS: Record<Gstr2aMatchStatusApi, string> =
  {
    MATCHED: "Matched",
    PARTIAL_MATCH: "Partial Match",
    MISSING_IN_BOOKS: "Missing in Books",
    MISSING_IN_GSTR: "Missing in GSTR-2B",
    DUPLICATE: "Duplicate",
    NEEDS_REVIEW: "Needs Review",
  };

/** Backend review_status enum → display labels. */
export const GSTR2B_REVIEW_STATUS_LABELS: Record<
  Gstr2aReviewStatusApi,
  string
> = {
  PENDING: "Pending",
  MARKED_FOR_REVIEW: "Marked for Review",
  REVIEWED: "Reviewed",
  RESOLVED: "Resolved",
};

/** Portal ITC availability — read-only display. */
export const GSTR2B_PORTAL_ITC_LABELS: Record<
  GstPortalItcAvailabilityApi,
  string
> = {
  AVAILABLE: "ITC Available",
  NOT_AVAILABLE: "ITC Not Available",
  UNKNOWN: "Unknown",
  NOT_APPLICABLE: "—",
};

/** PVB ITC treatment — accountant decision display. */
export const GSTR2B_PVB_ITC_LABELS: Record<GstPvbItcTreatmentApi, string> = {
  TO_REVIEW: "To Review",
  ELIGIBLE_TO_CLAIM: "Eligible to Claim",
  HOLD: "Hold",
  INELIGIBLE: "Ineligible",
  REVERSAL_REQUIRED: "Reversal Required",
  CLAIMED: "Claimed",
  NOT_APPLICABLE: "—",
};

export function formatPortalItcLabel(
  value: string | null | undefined,
): string {
  if (value == null || value === "" || value === "NOT_APPLICABLE") return "—";
  return (
    GSTR2B_PORTAL_ITC_LABELS[value as GstPortalItcAvailabilityApi] ?? value
  );
}

export function formatPvbItcLabel(value: string | null | undefined): string {
  if (value == null || value === "" || value === "NOT_APPLICABLE") return "—";
  return GSTR2B_PVB_ITC_LABELS[value as GstPvbItcTreatmentApi] ?? value;
}

/** Allowed transitions mirrored from backend gstr2b-itc.workflow.ts */
export const GSTR2B_ITC_TRANSITIONS: Record<
  GstPvbItcTreatmentApi,
  Array<Exclude<GstPvbItcTreatmentApi, "NOT_APPLICABLE">>
> = {
  NOT_APPLICABLE: [],
  TO_REVIEW: [
    "ELIGIBLE_TO_CLAIM",
    "HOLD",
    "INELIGIBLE",
    "REVERSAL_REQUIRED",
  ],
  HOLD: ["ELIGIBLE_TO_CLAIM", "INELIGIBLE", "TO_REVIEW"],
  ELIGIBLE_TO_CLAIM: [
    "CLAIMED",
    "HOLD",
    "TO_REVIEW",
    "REVERSAL_REQUIRED",
  ],
  CLAIMED: ["REVERSAL_REQUIRED", "TO_REVIEW"],
  INELIGIBLE: ["TO_REVIEW"],
  REVERSAL_REQUIRED: ["TO_REVIEW"],
};

/* ── Legacy demo types (unused by production Gstr2bPageClient) ─────────── */

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

export const AMOUNT_TOLERANCE = 1;

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
  systemStatus: Gstr2bMatchStatus;
  remarks: string;
  booksSourceId: number | null;
  portalDocId: string | null;
  ledger: string;
  itcAvailable: boolean | null;
  isDemo?: boolean;
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
  isDemo?: boolean;
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

export type Gstr2bFilters = GstReportFilters;

export interface Gstr2bReport {
  rows: Gstr2bReconRow[];
  summary: Gstr2bSummaryCounts;
  uploads: Gstr2bUploadRecord[];
  activeUpload: Gstr2bUploadRecord | null;
  hasData: boolean;
  portalDocuments?: Gstr2bPortalDocument[];
  booksDocuments?: Gstr2bBooksDocument[];
}

