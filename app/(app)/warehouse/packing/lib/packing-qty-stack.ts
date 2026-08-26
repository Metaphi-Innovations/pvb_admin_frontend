import { stackGrnLineQty } from "@/app/(app)/warehouse/grn/shared/grn-qty-stack";
import type { GrnQtyStackParts } from "@/lib/warehouse/grn-quantity";
import type { QtyStackMeta } from "@/app/(app)/sales/shared/StackedQtyDisplay";

export type PackingQtyMeta = {
  packSize?: number | null;
  quantity_type?: string | null;
  netWeightPerPack?: number | null;
  weightUom?: string | null;
  productSnapshot?: Record<string, unknown> | null;
};

/** Map packing line meta → Sales packing-list StackedQtyDisplay meta. */
export function toQtyStackMeta(line: PackingQtyMeta): QtyStackMeta {
  const snap = asRecord(line.productSnapshot);
  const unitsPerPacking =
    (Number(line.packSize) > 0 ? Number(line.packSize) : 0) ||
    Number(snap.unit_per_packing) ||
    Number(snap.conversion_qty) ||
    1;
  const qtyType = String(line.quantity_type || "").trim().toLowerCase();
  const quantityType =
    qtyType === "piece" || qtyType === "pieces" ? "Piece" : "Case";
  const uom =
    asString(line.weightUom) ||
    asString(snap.base_unit) ||
    asString(snap.unit) ||
    asString(snap.uom) ||
    null;
  const unitPackSize =
    Number(snap.pack_size) ||
    Number(snap.packSize) ||
    Number(snap.unit_size) ||
    null;
  const netWeight =
    (Number(line.netWeightPerPack) > 0 ? Number(line.netWeightPerPack) : 0) ||
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

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** True when the line is packed/ordered in pieces rather than cases. */
export function isPackingPieceQty(quantityType?: string | null): boolean {
  const qtyType = String(quantityType || "").trim().toLowerCase();
  return qtyType === "piece" || qtyType === "pieces";
}

/** Packing size for labeled stacked Qty (hides Case row for piece-only lines). */
export function packingLineDisplayPackingSize(line: PackingQtyMeta): number {
  if (isPackingPieceQty(line.quantity_type)) return 1;
  const size = Number(line.packSize) || 0;
  return size > 0 ? size : 1;
}

/** Convert stored base qty into Case / Unit / Kg-Litre using GRN conversion. */
export function packingLineQtyStack(baseQty: number, line: PackingQtyMeta): GrnQtyStackParts {
  return stackGrnLineQty(baseQty, {
    packingSize: line.packSize,
    netWeightPerPack: line.netWeightPerPack,
    weightUom: line.weightUom,
    productSnapshot: line.productSnapshot,
  });
}

/**
 * Normalize product identity + packing/weight meta from packing-list / packing-done APIs.
 * Display-only — does not change stored base quantities.
 */
export function extractPackingProductDisplay(raw: Record<string, unknown>): {
  productName: string;
  sku: string;
  productCode: string;
  packSize: number;
  productSnapshot: Record<string, unknown>;
} {
  const product = asRecord(raw.product);
  const snap = asRecord(raw.product_snapshot);
  const nestedSnap = asRecord(
    (raw.packing_list_product as Record<string, unknown> | undefined)?.product_snapshot,
  );
  const merged = { ...product, ...nestedSnap, ...snap };

  const packSizeRaw =
    product.unit_per_packing ??
    snap.unit_per_packing ??
    nestedSnap.unit_per_packing ??
    snap.conversion_rate ??
    snap.conversion_qty ??
    snap.conversion_factor ??
    nestedSnap.conversion_rate ??
    1;
  const packSize = Number(packSizeRaw) || 1;

  const productCode =
    asString(product.product_code).trim() ||
    asString(snap.product_code).trim() ||
    asString(raw.product_code).trim();

  const sku =
    asString(product.sku).trim() ||
    asString(snap.sku).trim() ||
    asString(snap.SKU).trim() ||
    asString(raw.sku).trim() ||
    productCode;

  const productName =
    asString(product.product_name).trim() ||
    asString(snap.product_name).trim() ||
    asString(raw.product_name).trim() ||
    asString(raw.product).trim();

  return {
    productName,
    sku,
    productCode,
    packSize: packSize > 0 ? packSize : 1,
    productSnapshot: merged,
  };
}
