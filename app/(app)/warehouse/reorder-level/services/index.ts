import { ReorderLevel, ReorderFormData } from "../types";
import { getReorderRecords, saveReorderRecords } from "../mock-data";
import { computeStatus, ALL_WAREHOUSE_VALUES } from "../constants";

export function getReordersByWarehouse(warehouse: string = "All"): ReorderLevel[] {
  const all = getReorderRecords();
  if (warehouse === "All") return all;
  return all.filter(r => r.warehouse === warehouse);
}

export function getAllReorders(): ReorderLevel[] {
  return getReorderRecords();
}

export function getReorderById(id: string): ReorderLevel | undefined {
  return getReorderRecords().find(r => r.id === id);
}

/** All records for a specific product (across all warehouses) */
export function getReordersByProduct(product: string): ReorderLevel[] {
  return getReorderRecords().filter(r => r.product === product);
}

/**
 * Save a reorder level config.
 * If warehouse === "All", creates/updates a record for EVERY warehouse.
 * If editing (id provided), updates just that record.
 */
export function saveReorder(data: ReorderFormData, id?: string): void {
  const records = getReorderRecords();
  const today = new Date().toISOString().split("T")[0];

  if (id) {
    // Edit existing single record
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx] = {
        ...records[idx],
        reorderLevelQty: data.reorderLevelQty,
        status: computeStatus(records[idx].currentStock, data.reorderLevelQty),
        lastUpdated: today,
      };
    }
  } else {
    // Create — target warehouses
    const targetWarehouses = data.warehouse === "All" ? ALL_WAREHOUSE_VALUES : [data.warehouse];

    targetWarehouses.forEach(wh => {
      // Check if a record already exists for this product+warehouse — update it
      const existing = records.findIndex(r => r.product === data.product && r.warehouse === wh);
      if (existing !== -1) {
        records[existing] = {
          ...records[existing],
          reorderLevelQty: data.reorderLevelQty,
          status: computeStatus(records[existing].currentStock, data.reorderLevelQty),
          lastUpdated: today,
        };
      } else {
        records.push({
          id: `rl-${Date.now()}-${wh.replace(/\s/g, "")}`,
          warehouse: wh,
          product: data.product,
          sku: data.sku,
          category: data.category,
          currentStock: 0,
          reservedStock: 0,
          reorderLevelQty: data.reorderLevelQty,
          status: computeStatus(0, data.reorderLevelQty),
          lastUpdated: today,
        });
      }
    });
  }

  saveReorderRecords(records);
}

export function deleteReorder(id: string): void {
  const records = getReorderRecords().filter(r => r.id !== id);
  saveReorderRecords(records);
}

export function generateStats(records: ReorderLevel[]) {
  return {
    totalConfigured: records.length,
    inStock: records.filter(r => r.status === "In Stock").length,
    lowStock: records.filter(r => r.status === "Low Stock").length,
  };
}
