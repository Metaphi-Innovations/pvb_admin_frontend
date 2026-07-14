import { AMOUNT_TOLERANCE, type Gstr2aDocType, type Gstr2aMatchStatus } from "./gstr2a-report-types";

/** Normalize invoice number — ignore spaces, hyphens, letter case. */
export function normalizeInvoiceNo(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

export function buildMatchKey(
  supplierGstin: string,
  docType: Gstr2aDocType,
  invoiceNo: string,
): string {
  return `${supplierGstin.trim().toUpperCase()}|${docType}|${normalizeInvoiceNo(invoiceNo)}`;
}

/** Total GST = CGST + SGST + IGST (cess excluded). */
export function totalGst(doc: { cgst: number; sgst: number; igst: number } | null | undefined): number {
  if (!doc) return 0;
  return Math.round((doc.cgst + doc.sgst + doc.igst) * 100) / 100;
}

function withinTolerance(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
}

export function compareMatchedPair(
  books: {
    invoiceDate: string;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  },
  portal: {
    invoiceDate: string;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
  },
): {
  status: Extract<Gstr2aMatchStatus, "matched" | "partial_match">;
  remarks: string;
  dateMismatch: boolean;
  taxableDifference: number;
  gstDifference: number;
} {
  const dateMismatch = books.invoiceDate !== portal.invoiceDate;
  const taxableDifference =
    Math.round((books.taxableAmount - portal.taxableAmount) * 100) / 100;
  const gstDifference =
    Math.round((totalGst(books) - totalGst(portal)) * 100) / 100;

  const taxableOk = withinTolerance(books.taxableAmount, portal.taxableAmount);
  const gstOk = withinTolerance(totalGst(books), totalGst(portal));

  if (!dateMismatch && taxableOk && gstOk) {
    return {
      status: "matched",
      remarks: "Ready for reconciliation",
      dateMismatch: false,
      taxableDifference,
      gstDifference,
    };
  }

  const reasons: string[] = [];
  if (dateMismatch) reasons.push("Date mismatch");
  if (!taxableOk) reasons.push("Amount mismatch");
  if (!gstOk) reasons.push("GST difference");

  return {
    status: "partial_match",
    remarks: reasons.join("; ") || "Partial match",
    dateMismatch,
    taxableDifference,
    gstDifference,
  };
}

export function computeDifference(
  books: { taxableAmount: number; cgst: number; sgst: number; igst: number } | null,
  portal: { taxableAmount: number; cgst: number; sgst: number; igst: number } | null,
): number {
  const b = (books?.taxableAmount ?? 0) + totalGst(books);
  const p = (portal?.taxableAmount ?? 0) + totalGst(portal);
  return Math.round((b - p) * 100) / 100;
}

export function computeTaxableDifference(
  books: { taxableAmount: number } | null,
  portal: { taxableAmount: number } | null,
): number {
  return Math.round(((books?.taxableAmount ?? 0) - (portal?.taxableAmount ?? 0)) * 100) / 100;
}

export function computeGstDifference(
  books: { cgst: number; sgst: number; igst: number } | null,
  portal: { cgst: number; sgst: number; igst: number } | null,
): number {
  return Math.round((totalGst(books) - totalGst(portal)) * 100) / 100;
}
