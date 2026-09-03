/**
 * Map Credit / Debit note product lines to the shared quantity table view model.
 */

import { roundMoney } from "@/lib/accounts/money-format";
import type { NoteQuantityLineView } from "@/components/accounts/voucher-form/NoteQuantityLinesTable";

export interface NoteLineQtySource {
  id: string;
  productName: string;
  sku?: string;
  hsn?: string;
  batchNo?: string;
  mfgDate?: string;
  expiryDate?: string;
  invoiceQty: number;
  eligibleReturnQty?: number;
  salesReturnQty?: number;
  purchaseReturnQty?: number;
  returnQty: number;
  unitPrice: number;
  taxPct: number;
  creditAmount?: number;
  debitAmount?: number;
  gstAmount?: number;
  uom?: string;
}

function maxEligible(line: NoteLineQtySource): number {
  if (line.eligibleReturnQty != null && line.eligibleReturnQty > 0) return line.eligibleReturnQty;
  if (line.salesReturnQty != null && line.salesReturnQty > 0) return line.salesReturnQty;
  if (line.purchaseReturnQty != null && line.purchaseReturnQty > 0) return line.purchaseReturnQty;
  return line.invoiceQty > 0 ? line.invoiceQty : 0;
}

/**
 * Map a note line for the quantity entry table.
 * Qty defaults blank/0 until the user enters a value (invoice qty mode).
 * Cap shown/enforced as invoice quantity (originalQty).
 */
export function mapNoteLineToQuantityView(
  line: NoteLineQtySource,
  opts?: { interstate?: boolean },
): NoteQuantityLineView {
  const remaining = maxEligible(line);
  /** Invoice quantity is the hard cap for invoice-based notes. */
  const original = line.invoiceQty > 0 ? line.invoiceQty : remaining;
  const previously = Math.max(0, roundMoney(original - remaining));
  /** Prefer explicit note qty; for returns fall back to return qty fields. */
  const qty =
    line.returnQty > 0
      ? line.returnQty
      : line.salesReturnQty && line.salesReturnQty > 0
        ? line.salesReturnQty
        : line.purchaseReturnQty && line.purchaseReturnQty > 0
          ? line.purchaseReturnQty
          : 0;
  const rate = line.unitPrice || 0;
  const taxPct = line.taxPct || 0;
  const basic = roundMoney(qty * rate);
  const taxAmt =
    taxPct > 0
      ? roundMoney(basic * (taxPct / 100))
      : line.gstAmount && line.gstAmount > 0
        ? line.gstAmount
        : 0;
  const interstate = opts?.interstate ?? false;
  const cgst = !interstate && taxAmt > 0 ? roundMoney(taxAmt / 2) : 0;
  const sgst = !interstate && taxAmt > 0 ? roundMoney(taxAmt - cgst) : 0;
  const igst = interstate ? taxAmt : 0;
  const lineTotal = roundMoney(basic + taxAmt);

  return {
    id: line.id,
    productName: line.productName,
    sku: line.sku,
    hsn: line.hsn,
    batchNo: line.batchNo,
    mfgDate: line.mfgDate,
    expiryDate: line.expiryDate,
    originalQty: original,
    previouslyAdjustedQty: previously,
    remainingEligibleQty: remaining,
    currentQty: qty,
    rate,
    taxPct,
    taxable: basic,
    cgst,
    sgst,
    igst,
    lineTotal,
    uom: line.uom,
  };
}
