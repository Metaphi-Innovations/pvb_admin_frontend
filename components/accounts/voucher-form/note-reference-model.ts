/**
 * Normalized read-only reference document model for Credit / Debit Note.
 * Adapters map Sales Invoice, Sales Return, Purchase Invoice, Purchase Return.
 */

export type NoteReferenceSourceType =
  | "sales_invoice"
  | "sales_return"
  | "purchase_invoice"
  | "purchase_return";

export interface NoteReferenceLineView {
  id: string;
  productName: string;
  sku?: string;
  hsn?: string;
  batchNo?: string;
  mfgDate?: string;
  expiryDate?: string;
  sourceQty: number;
  uom?: string;
  rate: number;
  basicAmount: number;
  gstPct: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface NoteReferenceDocumentView {
  referenceType: NoteReferenceSourceType;
  referenceTypeLabel: string;
  documentNumber: string;
  documentDate: string;
  partyName: string;
  subTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  lines: NoteReferenceLineView[];
}

const REF_LABELS: Record<NoteReferenceSourceType, string> = {
  sales_invoice: "Sales Invoice",
  sales_return: "Sales Return",
  purchase_invoice: "Purchase Invoice",
  purchase_return: "Purchase Return",
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function splitGst(gstAmount: number, interstate: boolean): { cgst: number; sgst: number; igst: number } {
  if (gstAmount <= 0) return { cgst: 0, sgst: 0, igst: 0 };
  if (interstate) return { cgst: 0, sgst: 0, igst: round2(gstAmount) };
  const cgst = round2(gstAmount / 2);
  const sgst = round2(gstAmount - cgst);
  return { cgst, sgst, igst: 0 };
}

function lineBasic(qty: number, rate: number, discountPct = 0): number {
  const base = Math.max(0, qty) * Math.max(0, rate);
  return round2(Math.max(0, base - base * (Math.max(0, discountPct) / 100)));
}

/** Shared line mapper for credit-note source lines (invoice / sales return). */
export function adaptCreditSourceLines(
  lines: Array<{
    id: string;
    productName: string;
    sku?: string;
    hsn?: string;
    batchNo?: string;
    mfgDate?: string;
    expiryDate?: string;
    invoiceQty: number;
    salesReturnQty?: number;
    uom?: string;
    unitPrice: number;
    discountPct?: number;
    taxPct: number;
    gstAmount?: number;
    lineAmount?: number;
  }>,
  opts: { useSalesReturnQty?: boolean; interstate?: boolean },
): NoteReferenceLineView[] {
  return lines.map((line) => {
    const sourceQty = opts.useSalesReturnQty
      ? line.salesReturnQty && line.salesReturnQty > 0
        ? line.salesReturnQty
        : line.invoiceQty
      : line.invoiceQty;
    const basic = lineBasic(sourceQty, line.unitPrice, line.discountPct);
    const gstPct = line.taxPct || 0;
    const gstAmount =
      line.gstAmount != null && line.gstAmount > 0
        ? round2(line.gstAmount)
        : gstPct > 0
          ? round2(basic * (gstPct / 100))
          : 0;
    const { cgst, sgst, igst } = splitGst(gstAmount, Boolean(opts.interstate));
    const lineTotal =
      line.lineAmount != null && line.lineAmount > 0
        ? round2(line.lineAmount)
        : round2(basic + gstAmount);
    return {
      id: line.id,
      productName: line.productName,
      sku: line.sku,
      hsn: line.hsn,
      batchNo: line.batchNo,
      mfgDate: line.mfgDate,
      expiryDate: line.expiryDate,
      sourceQty,
      uom: line.uom,
      rate: line.unitPrice,
      basicAmount: basic,
      gstPct,
      cgst,
      sgst,
      igst,
      lineTotal,
    };
  });
}

/** Shared line mapper for debit-note source lines (PI / PR). */
export function adaptDebitSourceLines(
  lines: Array<{
    id: string;
    productName: string;
    sku?: string;
    hsn?: string;
    batchNo?: string;
    mfgDate?: string;
    expiryDate?: string;
    invoiceQty: number;
    purchaseReturnQty?: number;
    uom?: string;
    unitPrice: number;
    discountPct?: number;
    taxPct: number;
    gstAmount?: number;
    lineAmount?: number;
  }>,
  opts: { usePurchaseReturnQty?: boolean },
): NoteReferenceLineView[] {
  return lines.map((line) => {
    const sourceQty = opts.usePurchaseReturnQty
      ? line.purchaseReturnQty && line.purchaseReturnQty > 0
        ? line.purchaseReturnQty
        : line.invoiceQty
      : line.invoiceQty;
    const basic = lineBasic(sourceQty, line.unitPrice, line.discountPct);
    const gstPct = line.taxPct || 0;
    const gstAmount =
      line.gstAmount != null && line.gstAmount > 0
        ? round2(line.gstAmount)
        : gstPct > 0
          ? round2(basic * (gstPct / 100))
          : 0;
    const { cgst, sgst, igst } = splitGst(gstAmount, false);
    const lineTotal =
      line.lineAmount != null && line.lineAmount > 0
        ? round2(line.lineAmount)
        : round2(basic + gstAmount);
    return {
      id: line.id,
      productName: line.productName,
      sku: line.sku,
      hsn: line.hsn,
      batchNo: line.batchNo,
      mfgDate: line.mfgDate,
      expiryDate: line.expiryDate,
      sourceQty,
      uom: line.uom,
      rate: line.unitPrice,
      basicAmount: basic,
      gstPct,
      cgst,
      sgst,
      igst,
      lineTotal,
    };
  });
}

function sumLines(lines: NoteReferenceLineView[]) {
  return lines.reduce(
    (acc, l) => {
      acc.subTotal += l.basicAmount;
      acc.cgst += l.cgst;
      acc.sgst += l.sgst;
      acc.igst += l.igst;
      acc.grandTotal += l.lineTotal;
      return acc;
    },
    { subTotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 },
  );
}

export function adaptSalesInvoiceReference(input: {
  documentNumber: string;
  documentDate: string;
  partyName: string;
  grandTotal?: number;
  interstate?: boolean;
  lines: Parameters<typeof adaptCreditSourceLines>[0];
}): NoteReferenceDocumentView {
  const lines = adaptCreditSourceLines(input.lines, {
    useSalesReturnQty: false,
    interstate: input.interstate,
  });
  const sums = sumLines(lines);
  return {
    referenceType: "sales_invoice",
    referenceTypeLabel: REF_LABELS.sales_invoice,
    documentNumber: input.documentNumber || "—",
    documentDate: input.documentDate || "—",
    partyName: input.partyName || "—",
    subTotal: round2(sums.subTotal),
    cgst: round2(sums.cgst),
    sgst: round2(sums.sgst),
    igst: round2(sums.igst),
    grandTotal: input.grandTotal != null ? round2(input.grandTotal) : round2(sums.grandTotal),
    lines,
  };
}

export function adaptSalesReturnReference(input: {
  documentNumber: string;
  documentDate: string;
  partyName: string;
  grandTotal?: number;
  interstate?: boolean;
  lines: Parameters<typeof adaptCreditSourceLines>[0];
}): NoteReferenceDocumentView {
  const lines = adaptCreditSourceLines(input.lines, {
    useSalesReturnQty: true,
    interstate: input.interstate,
  });
  const sums = sumLines(lines);
  return {
    referenceType: "sales_return",
    referenceTypeLabel: REF_LABELS.sales_return,
    documentNumber: input.documentNumber || "—",
    documentDate: input.documentDate || "—",
    partyName: input.partyName || "—",
    subTotal: round2(sums.subTotal),
    cgst: round2(sums.cgst),
    sgst: round2(sums.sgst),
    igst: round2(sums.igst),
    grandTotal: input.grandTotal != null ? round2(input.grandTotal) : round2(sums.grandTotal),
    lines,
  };
}

export function adaptPurchaseInvoiceReference(input: {
  documentNumber: string;
  documentDate: string;
  partyName: string;
  grandTotal?: number;
  lines: Parameters<typeof adaptDebitSourceLines>[0];
}): NoteReferenceDocumentView {
  const lines = adaptDebitSourceLines(input.lines, { usePurchaseReturnQty: false });
  const sums = sumLines(lines);
  return {
    referenceType: "purchase_invoice",
    referenceTypeLabel: REF_LABELS.purchase_invoice,
    documentNumber: input.documentNumber || "—",
    documentDate: input.documentDate || "—",
    partyName: input.partyName || "—",
    subTotal: round2(sums.subTotal),
    cgst: round2(sums.cgst),
    sgst: round2(sums.sgst),
    igst: round2(sums.igst),
    grandTotal: input.grandTotal != null ? round2(input.grandTotal) : round2(sums.grandTotal),
    lines,
  };
}

export function adaptPurchaseReturnReference(input: {
  documentNumber: string;
  documentDate: string;
  partyName: string;
  grandTotal?: number;
  lines: Parameters<typeof adaptDebitSourceLines>[0];
}): NoteReferenceDocumentView {
  const lines = adaptDebitSourceLines(input.lines, { usePurchaseReturnQty: true });
  const sums = sumLines(lines);
  return {
    referenceType: "purchase_return",
    referenceTypeLabel: REF_LABELS.purchase_return,
    documentNumber: input.documentNumber || "—",
    documentDate: input.documentDate || "—",
    partyName: input.partyName || "—",
    subTotal: round2(sums.subTotal),
    cgst: round2(sums.cgst),
    sgst: round2(sums.sgst),
    igst: round2(sums.igst),
    grandTotal: input.grandTotal != null ? round2(input.grandTotal) : round2(sums.grandTotal),
    lines,
  };
}
