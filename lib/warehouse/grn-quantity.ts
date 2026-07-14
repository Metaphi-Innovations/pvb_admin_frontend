/** GRN quantity type — UX only; DB stores base quantity. */
export type GrnQuantityType = "CASE" | "PIECE";

export const GRN_QUANTITY_TYPE_OPTIONS: { value: GrnQuantityType; label: string }[] = [
  { value: "CASE", label: "Case" },
  { value: "PIECE", label: "Piece" },
];

/** Default for newly added product rows. */
export const DEFAULT_NEW_GRN_QUANTITY_TYPE: GrnQuantityType = "CASE";

/** Legacy GRNs without quantity_type. */
export const DEFAULT_LEGACY_GRN_QUANTITY_TYPE: GrnQuantityType = "PIECE";

export function normalizeGrnQuantityType(
  value?: string | null,
): GrnQuantityType | null {
  if (value == null || String(value).trim() === "") return null;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "CASE" || normalized === "PIECE") return normalized;
  return null;
}

export function resolveGrnQuantityType(
  value?: string | null,
): GrnQuantityType {
  return normalizeGrnQuantityType(value) ?? DEFAULT_LEGACY_GRN_QUANTITY_TYPE;
}

/**
 * Purchase Order GRNs are always Case by default — suppliers ship in cases.
 * Missing quantity_type falls back to CASE (not legacy PIECE).
 */
export function resolvePoGrnQuantityType(
  value?: string | null,
): GrnQuantityType {
  return normalizeGrnQuantityType(value) ?? DEFAULT_NEW_GRN_QUANTITY_TYPE;
}

export function resolvePackingSize(input?: {
  unitPerPacking?: number | null;
  packingSize?: number | null;
  productSnapshot?: Record<string, unknown> | null;
}): number {
  const fromSnapshot = (snapshot?: Record<string, unknown> | null): number => {
    if (!snapshot) return 0;
    const n = (v: unknown) => {
      const num = Number(v);
      return Number.isFinite(num) ? num : 0;
    };
    return (
      n(snapshot.unit_per_packing) ||
      n(snapshot.packing_size) ||
      n(snapshot.case_size) ||
      n(snapshot.units_per_case) ||
      n(snapshot.conversion_qty) ||
      0
    );
  };

  return (
    (input?.unitPerPacking && input.unitPerPacking > 0 ? input.unitPerPacking : 0) ||
    (input?.packingSize && input.packingSize > 0 ? input.packingSize : 0) ||
    fromSnapshot(input?.productSnapshot) ||
    0
  );
}

/** Convert display qty (cases or pieces) → base qty for API. */
export function toBaseQuantity(input: {
  quantity: number;
  quantityType?: string | null;
  packingSize: number;
}): number {
  const qty = Number(input.quantity) || 0;
  if (qty < 0) throw new Error("Quantity cannot be negative.");
  const type = resolveGrnQuantityType(input.quantityType);
  if (type === "PIECE") return qty;
  if (!(input.packingSize > 0)) {
    throw new Error("Packing size must be greater than zero when quantity type is CASE.");
  }
  return qty * input.packingSize;
}

/** Convert stored base qty → display qty for edit/view. */
export function fromBaseQuantity(input: {
  baseQty: number;
  quantityType?: string | null;
  packingSize: number;
}): number {
  const base = Number(input.baseQty) || 0;
  const type = resolveGrnQuantityType(input.quantityType);
  if (type === "PIECE") return base;
  if (!(input.packingSize > 0)) return base;
  return base / input.packingSize;
}

export function formatDisplayQuantity(input: {
  baseQty: number;
  quantityType?: string | null;
  packingSize: number;
}): { quantity: number; quantityType: GrnQuantityType; label: string } {
  const quantityType = resolveGrnQuantityType(input.quantityType);
  const quantity = fromBaseQuantity(input);
  return {
    quantity,
    quantityType,
    label: quantityType === "CASE" ? "Case" : "Piece",
  };
}
