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

/** Inventory case rows QC would create for CASE qty (one row per case). */
export function estimateCaseRowCount(baseQty: number, caseSize: number): number {
  const size = caseSize > 0 ? caseSize : 1;
  return Math.ceil(Math.max(0, baseQty) / size);
}
