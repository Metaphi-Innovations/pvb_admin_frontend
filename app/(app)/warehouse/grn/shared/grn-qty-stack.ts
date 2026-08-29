import { resolveNetWeightPerPack } from "@/lib/procurement/procurement-line-utils";
import {
  formatStackNum,
  resolveGrnQtyStack,
  type GrnQtyStackParts,
} from "@/lib/warehouse/grn-quantity";

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/**
 * Normalize product snapshot so Case / Unit / Kg-Ltr resolution matches Purchase GRN
 * (same fields as PO / GRN detail mapping — no separate weight formula).
 */
export function enrichGrnProductSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  opts?: {
    product?: Record<string, unknown> | null;
    unitPerPacking?: number | null;
    unit?: string | null;
    netWeightPerPack?: number | null;
    packSize?: number | null;
  },
): Record<string, unknown> {
  const base = { ...(snapshot || {}) };
  const product = opts?.product || {};
  const packingSize =
    (opts?.unitPerPacking && opts.unitPerPacking > 0 ? opts.unitPerPacking : 0) ||
    asNumber(base.unit_per_packing) ||
    asNumber(base.conversion_qty) ||
    asNumber(product.unit_per_packing) ||
    asNumber(product.unitPerPacking) ||
    1;
  const baseUnit =
    opts?.unit ||
    asString(base.base_unit) ||
    asString(base.unit) ||
    asString(product.base_unit) ||
    asString(product.unit) ||
    "Unit";
  const netWeight =
    (opts?.netWeightPerPack && opts.netWeightPerPack > 0 ? opts.netWeightPerPack : 0) ||
    asNumber(base.net_weight) ||
    asNumber(base.netWeight) ||
    asNumber(base.net_weight_per_pack) ||
    asNumber(product.net_weight) ||
    asNumber(product.netWeight) ||
    asNumber(product.net_weight_per_packaging_unit) ||
    null;
  const packSize =
    (opts?.packSize && opts.packSize > 0 ? opts.packSize : 0) ||
    asNumber(base.pack_size) ||
    asNumber(base.packSize) ||
    asNumber(base.unit_size) ||
    asNumber(product.pack_size) ||
    asNumber(product.packSize) ||
    asNumber(product.unit_size) ||
    null;

  return {
    ...product,
    ...base,
    base_unit: baseUnit,
    unit: asString(base.unit) || asString(product.unit) || baseUnit,
    unit_per_packing: packingSize,
    ...(netWeight ? { net_weight: netWeight } : {}),
    ...(packSize ? { pack_size: packSize } : {}),
  };
}

/** Build Case / Unit / Kg-Ltr stack from base qty + packing + product snapshot. */
export function stackGrnLineQty(
  baseQty: number,
  opts: {
    packingSize?: number | null;
    unit?: string | null;
    productSnapshot?: Record<string, unknown> | null;
    netWeightPerPack?: number | null;
    weightUom?: string | null;
  } = {},
): GrnQtyStackParts {
  const snapshot = opts.productSnapshot || {};
  const packingSize =
    (opts.packingSize && opts.packingSize > 0 ? opts.packingSize : 0) ||
    asNumber(snapshot.unit_per_packing) ||
    asNumber(snapshot.conversion_qty) ||
    1;
  const baseUnit =
    opts.unit ||
    asString(snapshot.base_unit) ||
    asString(snapshot.unit) ||
    "Unit";
  const packSize =
    asNumber(snapshot.pack_size) ||
    asNumber(snapshot.packSize) ||
    asNumber(snapshot.unit_size) ||
    undefined;
  const weightMeta =
    opts.netWeightPerPack && opts.weightUom
      ? {
          netWeightPerPack: opts.netWeightPerPack,
          weightUom: opts.weightUom as "Kg" | "Ltr",
        }
      : resolveNetWeightPerPack({
          netWeight:
            asNumber(snapshot.net_weight) ||
            asNumber(snapshot.netWeight) ||
            asNumber(snapshot.net_weight_per_pack) ||
            opts.netWeightPerPack ||
            null,
          packSize: packSize ?? null,
          unitPerPacking: packingSize,
          baseUnit,
        });

  return resolveGrnQtyStack(baseQty, {
    packingSize,
    netWeightPerPack: weightMeta?.netWeightPerPack,
    weightUom: weightMeta?.weightUom,
  });
}

export function formatWeightStackPart(stack: GrnQtyStackParts): string {
  if (!stack.weightUom) return "—";
  const qty = stack.weightQty ?? 0;
  return `${formatStackNum(qty)} ${stack.weightUom}`;
}
