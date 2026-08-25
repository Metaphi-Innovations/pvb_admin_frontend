import type { QcItem } from "../types";
import { stackGrnLineQty } from "@/app/(app)/warehouse/grn/shared/grn-qty-stack";
import type { GrnQtyStackParts } from "@/lib/warehouse/grn-quantity";

export function qcItemQtyStack(baseQty: number, item: QcItem): GrnQtyStackParts {
  return stackGrnLineQty(baseQty, {
    packingSize: item.unitPerPacking,
    netWeightPerPack: item.netWeightPerPack,
    weightUom: item.weightUom,
  });
}

export function qcItemPackingSize(item: QcItem): number {
  return item.unitPerPacking && item.unitPerPacking > 0 ? item.unitPerPacking : 1;
}
