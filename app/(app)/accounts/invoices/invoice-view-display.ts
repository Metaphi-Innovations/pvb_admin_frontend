/**
 * Display helpers for Sales Invoice View — derive missing discount amounts
 * from stored Rate/Qty/% using the same calcLineAmounts utility.
 * Does not mutate invoice totals or posting data.
 */

import {
  calcLineAmounts,
  type InvoiceLineItem,
  type InvoiceRecord,
} from "./invoices-data";

export function formatMonthYear(iso?: string): string {
  if (!iso?.trim()) return "—";
  const [y, m] = iso.split("-");
  if (!y || !m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = parseInt(m, 10) - 1;
  return months[mi] ? `${months[mi]}-${y}` : iso;
}

/** Effective discount % for display (line or scheme). */
export function resolveDisplayDiscountPct(line: InvoiceLineItem): number {
  if (line.discountPct > 0) return line.discountPct;
  if (line.schemeDiscountPercent != null && line.schemeDiscountPercent > 0) {
    return line.schemeDiscountPercent;
  }
  return 0;
}

/**
 * Discount amount for display. Prefer calcLineAmounts when discountPct is set;
 * otherwise derive from scheme % × gross using the same formula as calcLineAmounts.
 */
export function resolveDisplayDiscountAmount(line: InvoiceLineItem): number {
  const { base, discountAmt } = calcLineAmounts(line);
  if (discountAmt > 0) return discountAmt;
  if (line.schemeDiscountAmount != null && line.schemeDiscountAmount > 0) {
    return Math.round(line.schemeDiscountAmount * (line.qty || 0) * 100) / 100;
  }
  const pct = resolveDisplayDiscountPct(line);
  if (pct > 0 && base > 0) {
    return Math.round(base * (pct / 100) * 100) / 100;
  }
  return 0;
}

/**
 * Scheme vs manual discount for a saved line. New invoices store both parts;
 * older invoices only have the combined discount (treated as scheme when a scheme is linked).
 */
export function resolveLineDiscountParts(line: InvoiceLineItem): {
  schemeAmt: number;
  finalRate: number;
  manualAmt: number;
  manualLabel: string;
} {
  const { base, discountAmt } = calcLineAmounts(line);
  const hasSplit = line.manualDiscountType != null || line.schemeLineAmount != null;
  let schemeAmt = 0;
  let manualAmt = 0;
  let manualLabel = "";
  if (hasSplit) {
    schemeAmt = Math.max(0, line.schemeLineAmount ?? 0);
    manualAmt = Math.max(
      0,
      line.manualDiscountAmount ?? Math.round((discountAmt - schemeAmt) * 100) / 100,
    );
    if (manualAmt > 0) {
      manualLabel =
        line.manualDiscountType === "Percentage"
          ? `${line.manualDiscountValue ?? 0}%`
          : "Fixed";
    }
  } else if (lineHasProductDiscount(line)) {
    schemeAmt = discountAmt;
  } else {
    manualAmt = discountAmt;
    if (manualAmt > 0 && line.discountPct > 0) manualLabel = `${line.discountPct}%`;
  }
  const finalRate =
    line.qty > 0 ? Math.round(((base - schemeAmt) / line.qty) * 100) / 100 : line.unitPrice;
  return { schemeAmt, finalRate, manualAmt, manualLabel };
}

export function lineHasProductDiscount(line: InvoiceLineItem): boolean {
  return (
    line.schemeApplied === "Yes" ||
    Boolean(line.schemeCode?.trim()) ||
    Boolean(line.schemeName?.trim())
  );
}

export function invoiceHasProductDiscount(inv: InvoiceRecord): boolean {
  return inv.lineItems.some(lineHasProductDiscount);
}

export function resolveLineSku(
  line: InvoiceLineItem,
  productCodeById: Map<number, string>,
  productSkuByUuid?: Map<string, string>,
): string {
  if (line.productUuid && productSkuByUuid) {
    const fromUuid = productSkuByUuid.get(line.productUuid)?.trim();
    if (fromUuid) return fromUuid;
  }
  if (line.productCode?.trim()) return line.productCode.trim();
  if (line.productId != null) {
    const fromMaster = productCodeById.get(line.productId);
    if (fromMaster) return fromMaster;
  }
  return "";
}
