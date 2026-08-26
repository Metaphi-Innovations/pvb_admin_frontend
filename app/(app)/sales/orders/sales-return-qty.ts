import type { QtyStackMeta } from "@/app/(app)/sales/shared/StackedQtyDisplay";

export type SalesReturnQtyMetaSource = {
  unitPerPacking?: number | null;
  quantityType?: string | null;
  uom?: string | null;
  unitPackSize?: number | null;
  netWeight?: number | null;
  productSnapshot?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Map sales-return line/batch → StackedQtyDisplay meta (display only). */
export function toSalesReturnQtyMeta(source: SalesReturnQtyMetaSource): QtyStackMeta {
  const snap = asRecord(source.productSnapshot);
  const unitsPerPacking =
    (Number(source.unitPerPacking) > 0 ? Number(source.unitPerPacking) : 0) ||
    Number(snap.unit_per_packing) ||
    Number(snap.conversion_qty) ||
    1;
  const qtyType = String(source.quantityType || snap.quantity_type || "Case")
    .trim()
    .toLowerCase();
  const quantityType =
    qtyType === "piece" || qtyType === "pieces" || qtyType === "pcs" ? "Piece" : "Case";
  const uom =
    source.uom ||
    (typeof snap.base_unit === "string" ? snap.base_unit : null) ||
    (typeof snap.unit === "string" ? snap.unit : null) ||
    (typeof snap.uom === "string" ? snap.uom : null) ||
    null;
  const unitPackSize =
    (source.unitPackSize && source.unitPackSize > 0 ? source.unitPackSize : 0) ||
    Number(snap.pack_size) ||
    Number(snap.packSize) ||
    Number(snap.unit_size) ||
    null;
  const netWeight =
    (source.netWeight && source.netWeight > 0 ? source.netWeight : 0) ||
    Number(snap.net_weight) ||
    Number(snap.netWeight) ||
    Number(snap.net_weight_per_pack) ||
    null;

  return {
    unitsPerPacking: unitsPerPacking > 0 ? unitsPerPacking : 1,
    quantityType,
    uom,
    unitPackSize: unitPackSize && unitPackSize > 0 ? unitPackSize : null,
    netWeight: netWeight && netWeight > 0 ? netWeight : null,
  };
}

/** Dispatched qty in base units from case-dispatched value. */
export function salesReturnDispatchedBaseQty(
  dispatchedQtyCases: number,
  unitPerPacking = 10,
): number {
  const uKey = unitPerPacking > 0 ? unitPerPacking : 1;
  return Math.round(Number(dispatchedQtyCases || 0) * uKey);
}
