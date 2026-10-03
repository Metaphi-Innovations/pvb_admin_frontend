/** Max entered qty per line (PO pack qty, GRN display qty, QC case count). */
export const MAX_LINE_ENTRY_QTY = 1000;

export function exceedsMaxLineQty(
  qty: number,
  max: number = MAX_LINE_ENTRY_QTY,
): boolean {
  return Number.isFinite(qty) && qty > max;
}

export function maxLineQtyMessage(
  label = "Quantity",
  max: number = MAX_LINE_ENTRY_QTY,
): string {
  return `${label} cannot exceed ${max} per line.`;
}

/** Max digits (before the decimal point) accepted while typing qty / amount inputs. */
export const MAX_ENTRY_DIGITS = 7;

/**
 * True when typed numeric text has more than `maxDigits` digits before the decimal point.
 * Exponent notation (e.g. "1e9" from number inputs) is always rejected.
 */
export function exceedsEntryDigits(
  raw: string | number,
  maxDigits: number = MAX_ENTRY_DIGITS,
): boolean {
  const text = String(raw ?? "");
  if (/e/i.test(text)) return true;
  const intPart = text.replace(/[^\d.]/g, "").split(".")[0] ?? "";
  return intPart.replace(/^0+(?=\d)/, "").length > maxDigits;
}

/** Inventory case rows QC would create for CASE qty (one row per case). */
export function estimateCaseRowCount(baseQty: number, caseSize: number): number {
  const size = caseSize > 0 ? caseSize : 1;
  return Math.ceil(Math.max(0, baseQty) / size);
}
