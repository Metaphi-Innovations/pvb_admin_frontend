import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import { getInvoiceAmountBreakup } from "@/app/(app)/accounts/invoices/invoices-data";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";

export interface InvoiceGstBreakup {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  invoiceTotal: number;
  interstate: boolean;
}

export function isInterstateGst(
  gstTreatment?: string,
  placeOfSupply?: string,
  state?: string,
): boolean {
  if (gstTreatment && /igst|interstate/i.test(gstTreatment)) return true;
  if (placeOfSupply && state) {
    return placeOfSupply.trim().toLowerCase() !== state.trim().toLowerCase();
  }
  return false;
}

/** Split total GST into CGST/SGST (intrastate) or IGST (interstate). */
export function splitInvoiceGst(
  gstAmount: number,
  interstate: boolean,
): Pick<InvoiceGstBreakup, "cgst" | "sgst" | "igst"> {
  const gst = Math.round(Math.max(0, gstAmount) * 100) / 100;
  if (gst <= 0) return { cgst: 0, sgst: 0, igst: 0 };
  if (interstate) return { cgst: 0, sgst: 0, igst: gst };
  const cgst = Math.round(gst * 50) / 100;
  const sgst = Math.round((gst - cgst) * 100) / 100;
  return { cgst, sgst, igst: 0 };
}

export function getInvoiceGstBreakup(
  inv: Pick<
    InvoiceRecord,
    | "subtotal"
    | "discountTotal"
    | "taxAmount"
    | "grandTotal"
    | "gstTreatment"
    | "placeOfSupply"
    | "state"
  > & { interstate?: boolean },
): InvoiceGstBreakup {
  const { taxableValue, gstAmount, invoiceTotal } = getInvoiceAmountBreakup(inv);
  const interstate =
    inv.interstate ??
    isInterstateGst(inv.gstTreatment, inv.placeOfSupply, inv.state);
  const { cgst, sgst, igst } = splitInvoiceGst(gstAmount, interstate);
  return { taxableValue, cgst, sgst, igst, invoiceTotal, interstate };
}

export function getPendingRowGstBreakup(row: {
  taxableValue: number;
  gstAmount: number;
  invoiceValue: number;
  interstate?: boolean;
}): InvoiceGstBreakup {
  const interstate = row.interstate ?? false;
  const { cgst, sgst, igst } = splitInvoiceGst(row.gstAmount, interstate);
  return {
    taxableValue: row.taxableValue,
    cgst,
    sgst,
    igst,
    invoiceTotal: row.invoiceValue,
    interstate,
  };
}

/** Formatted strings for table cells and CSV export. */
export function formatInvoiceGstBreakup(gst: InvoiceGstBreakup) {
  return {
    taxableValue: formatMoney(gst.taxableValue),
    cgst: formatMoneyOrDash(gst.cgst),
    sgst: formatMoneyOrDash(gst.sgst),
    igst: formatMoneyOrDash(gst.igst),
    invoiceTotal: formatMoney(gst.invoiceTotal),
  };
}
