/**
 * Direct Debit Note interstate preview helper (frontend-only).
 * Prefers GSTIN state codes; falls back to normalized state names.
 * When either side is unknown, returns false (safe intra-state preview).
 */

export function gstinStateCode(gstin?: string | null): string | null {
  const normalized = gstin?.trim().toUpperCase();
  if (!normalized || normalized.length < 2) return null;
  return normalized.slice(0, 2);
}

export function normalizeStateKey(state?: string | null): string {
  return (state ?? "").trim().toLowerCase();
}

export function resolveDebitNoteInterstate(input: {
  warehouseGstin?: string | null;
  warehouseState?: string | null;
  vendorGstin?: string | null;
  vendorState?: string | null;
}): boolean {
  const warehouseCode = gstinStateCode(input.warehouseGstin);
  const vendorCode = gstinStateCode(input.vendorGstin);
  if (warehouseCode && vendorCode) {
    return warehouseCode !== vendorCode;
  }

  const warehouseState = normalizeStateKey(input.warehouseState);
  const vendorState = normalizeStateKey(input.vendorState);
  if (warehouseState && vendorState) {
    return warehouseState !== vendorState;
  }

  return false;
}
