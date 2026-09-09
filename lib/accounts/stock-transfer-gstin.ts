/**
 * Frontend GSTIN classification for Stock Transfer presentation.
 * Prefer backend treatment when exposed; otherwise compare trusted warehouse GSTIN snapshots.
 */

export type StockTransferGstinTreatment =
  | "SAME_GSTIN"
  | "DIFFERENT_GSTIN"
  | "UNKNOWN";

function normalizeGstin(value?: string | null): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/**
 * Classify transfer by source/destination warehouse GSTIN.
 * Does not invent business treatment from warehouse state names.
 */
export function classifyStockTransferByGstin(input: {
  sourceGstin?: string | null;
  destinationGstin?: string | null;
}): {
  treatment: StockTransferGstinTreatment;
  sourceGstin: string;
  destinationGstin: string;
} {
  const sourceGstin = normalizeGstin(input.sourceGstin);
  const destinationGstin = normalizeGstin(input.destinationGstin);
  if (!sourceGstin || !destinationGstin) {
    return { treatment: "UNKNOWN", sourceGstin, destinationGstin };
  }
  return {
    treatment:
      sourceGstin === destinationGstin ? "SAME_GSTIN" : "DIFFERENT_GSTIN",
    sourceGstin,
    destinationGstin,
  };
}

export function isSameGstinTreatment(
  treatment: StockTransferGstinTreatment,
): boolean {
  return treatment === "SAME_GSTIN";
}

export function isDifferentGstinTreatment(
  treatment: StockTransferGstinTreatment,
): boolean {
  return treatment === "DIFFERENT_GSTIN";
}

/** Business copy when Tax Invoice is not applicable. */
export const SAME_GSTIN_INVOICE_BLOCKED_MESSAGE =
  "This transfer is between warehouses under the same GSTIN. A Tax Invoice is not required. Use the Delivery Challan for this movement.";

export function isSameGstinInvoiceError(message?: string | null): boolean {
  const m = String(message || "").toLowerCase();
  return (
    m.includes("same-gstin") ||
    m.includes("same gstin") ||
    m.includes("sales_invoice_same_gstin_not_invoiceable") ||
    m.includes("delivery challan only")
  );
}

/**
 * Different-GSTIN Tax Invoice uses IGST in the current finalized interstate flow.
 * Prefer backend is_interstate / tax amounts when present.
 */
export function resolveStockTransferInterstateDisplay(input: {
  treatment: StockTransferGstinTreatment;
  backendIsInterstate?: boolean | null;
  backendIgstAmount?: number | null;
  backendCgstAmount?: number | null;
}): boolean {
  if (typeof input.backendIsInterstate === "boolean") {
    return input.backendIsInterstate;
  }
  const igst = Number(input.backendIgstAmount) || 0;
  const cgst = Number(input.backendCgstAmount) || 0;
  if (igst > 0 && cgst <= 0) return true;
  if (cgst > 0 && igst <= 0) return false;
  // Finalized Different-GSTIN flow posts IGST.
  return input.treatment === "DIFFERENT_GSTIN";
}
