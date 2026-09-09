import type { PurchaseReturnItem } from "./purchase-return-data";

export type PurchaseReturnWarehouseGroup = {
  warehouseId: string;
  warehouseName: string;
  items: PurchaseReturnItem[];
};

export const UNKNOWN_STOCK_WAREHOUSE_ID = "__unknown__";

/** Group eligible/return lines by physical stock warehouse. */
export function groupReturnItemsByStockWarehouse(
  items: PurchaseReturnItem[],
): PurchaseReturnWarehouseGroup[] {
  const map = new Map<string, PurchaseReturnWarehouseGroup>();
  for (const it of items) {
    const warehouseId = it.stockWarehouseId?.trim() || UNKNOWN_STOCK_WAREHOUSE_ID;
    const warehouseName =
      it.stockWarehouseName?.trim() ||
      (warehouseId === UNKNOWN_STOCK_WAREHOUSE_ID ? "Unknown warehouse" : warehouseId);
    const existing = map.get(warehouseId);
    if (existing) {
      existing.items.push(it);
    } else {
      map.set(warehouseId, { warehouseId, warehouseName, items: [it] });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.warehouseName.localeCompare(b.warehouseName, undefined, { sensitivity: "base" }),
  );
}

/** Warehouse implied by currently selected lines (one PR = one warehouse). */
export function resolveSelectedStockWarehouse(
  items: PurchaseReturnItem[],
): { warehouseId: string; warehouseName: string } | null {
  const active = items.filter(
    (it) => it.selected && it.lineStatus !== "fully_returned",
  );
  const ids = [
    ...new Set(
      active
        .map((it) => it.stockWarehouseId?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length !== 1) return null;
  const sample = active.find((it) => it.stockWarehouseId?.trim() === ids[0]);
  return {
    warehouseId: ids[0],
    warehouseName: sample?.stockWarehouseName?.trim() || "",
  };
}

/**
 * Apply a line patch and soft-lock to one warehouse: selecting / qty on warehouse B
 * clears selections from other warehouses on the same form.
 */
export function applyPurchaseReturnItemPatch(
  items: PurchaseReturnItem[],
  id: string,
  patch: Partial<PurchaseReturnItem>,
): PurchaseReturnItem[] {
  const target = items.find((it) => it.id === id);
  if (!target) return items;

  const nextSelected = patch.selected ?? target.selected;
  const activating =
    Boolean(nextSelected) &&
    target.lineStatus !== "fully_returned" &&
    (patch.selected === true ||
      (patch.returnQty != null && patch.returnQty > 0) ||
      target.selected);

  const warehouseId = target.stockWarehouseId?.trim();

  return items.map((it) => {
    if (it.id === id) return { ...it, ...patch };
    if (
      activating &&
      warehouseId &&
      it.stockWarehouseId?.trim() &&
      it.stockWarehouseId.trim() !== warehouseId &&
      it.selected
    ) {
      return {
        ...it,
        selected: false,
        returnValue: 0,
        returnQty: 0,
        lineRemark: "",
      };
    }
    return it;
  });
}

/** Prefer selected stock WH; else sole eligible WH; else keep current header. */
export function resolveReturnHeaderWarehouse(
  items: PurchaseReturnItem[],
  current: { warehouseId: string; warehouseName: string },
): { warehouseId: string; warehouseName: string } {
  const fromSelected = resolveSelectedStockWarehouse(items);
  if (fromSelected) {
    return {
      warehouseId: fromSelected.warehouseId,
      warehouseName: fromSelected.warehouseName || current.warehouseName,
    };
  }
  const groups = groupReturnItemsByStockWarehouse(items).filter(
    (g) => g.warehouseId !== UNKNOWN_STOCK_WAREHOUSE_ID,
  );
  if (groups.length === 1) {
    return {
      warehouseId: groups[0].warehouseId,
      warehouseName: groups[0].warehouseName,
    };
  }
  return current;
}
