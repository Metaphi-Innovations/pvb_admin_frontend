/**
 * Many-to-many mapping between Bank Account Master and Warehouse Master.
 * Bank accounts appear in dropdowns only for warehouses they are mapped to.
 */

import { loadWarehouses, type WarehouseMaster } from "@/app/(app)/masters/warehouse/warehouse-data";
import type { ReportMultiSelectOption } from "@/lib/accounts/report-multi-filter-utils";

export const NO_BANK_MAPPED_TO_WAREHOUSE_MESSAGE =
  "No bank account is mapped to this warehouse. Please update the Bank Account Master.";

/** Active warehouses eligible for bank mapping. */
export function loadActiveWarehousesForMapping(): WarehouseMaster[] {
  return loadWarehouses().filter((w) => w.status === "active");
}

export function loadWarehouseMappingOptions(): ReportMultiSelectOption[] {
  return loadActiveWarehousesForMapping().map((w) => ({
    value: String(w.id),
    label: w.warehouseName,
    searchText: `${w.warehouseCode} ${w.city} ${w.state}`,
  }));
}

/** Legacy accounts without mappings default to all active warehouses. */
export function defaultMappedWarehouseIds(): number[] {
  return loadActiveWarehousesForMapping().map((w) => w.id);
}

export function normalizeMappedWarehouseIds(ids: number[] | undefined | null): number[] {
  if (Array.isArray(ids) && ids.length > 0) {
    const active = new Set(loadActiveWarehousesForMapping().map((w) => w.id));
    return [...new Set(ids.filter((id) => active.has(id)))];
  }
  return defaultMappedWarehouseIds();
}

export function isBankAccountMappedToWarehouse(
  mappedWarehouseIds: number[] | undefined | null,
  warehouseId: number,
  status: "active" | "inactive" = "active",
): boolean {
  if (status !== "active") return false;
  const mapped = normalizeMappedWarehouseIds(mappedWarehouseIds);
  return mapped.includes(warehouseId);
}

/** Resolve warehouse from id, code, or name (including common invoice labels). */
export function resolveWarehouseRef(
  ref: string | number | null | undefined,
): WarehouseMaster | null {
  if (ref == null || ref === "" || ref === "—") return null;
  const active = loadActiveWarehousesForMapping();

  if (typeof ref === "number" && Number.isFinite(ref)) {
    return active.find((w) => w.id === ref) ?? null;
  }

  const raw = String(ref).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    return active.find((w) => w.id === id) ?? null;
  }

  const lower = raw.toLowerCase();

  const exact =
    active.find((w) => w.warehouseName.toLowerCase() === lower) ??
    active.find((w) => w.warehouseCode.toLowerCase() === lower);
  if (exact) return exact;

  const partial = active.find(
    (w) =>
      w.warehouseName.toLowerCase().includes(lower) ||
      lower.includes(w.warehouseName.toLowerCase()),
  );
  if (partial) return partial;

  if (lower.includes("central")) {
    return (
      active.find((w) => w.warehouseName.toLowerCase().includes("central")) ??
      active.find((w) => w.warehouseType === "Central Warehouse") ??
      null
    );
  }
  if (lower.includes("mumbai")) {
    return active.find((w) => w.warehouseName.toLowerCase().includes("mumbai")) ?? null;
  }
  if (lower.includes("pune")) {
    return (
      active.find((w) => w.city.toLowerCase() === "pune" || w.warehouseName.toLowerCase().includes("pune")) ??
      null
    );
  }
  if (lower.includes("gujarat") || lower.includes("ahmedabad")) {
    return active.find((w) => w.warehouseName.toLowerCase().includes("gujarat")) ?? null;
  }

  return null;
}

export function resolveWarehouseId(ref: string | number | null | undefined): number | null {
  return resolveWarehouseRef(ref)?.id ?? null;
}

export function warehouseLabelsForIds(mappedWarehouseIds: number[] | undefined | null): string[] {
  const ids = new Set(normalizeMappedWarehouseIds(mappedWarehouseIds));
  return loadActiveWarehousesForMapping()
    .filter((w) => ids.has(w.id))
    .map((w) => w.warehouseName);
}

export interface BankAccountWarehouseFilterable {
  status: "active" | "inactive";
  mappedWarehouseIds?: number[];
}

export function filterBankAccountsForWarehouse<T extends BankAccountWarehouseFilterable>(
  accounts: T[],
  warehouseRef: string | number | null | undefined,
): T[] {
  const active = accounts.filter((a) => a.status === "active");
  const warehouseId = resolveWarehouseId(warehouseRef);
  if (warehouseId == null) return active;
  return active.filter((a) =>
    isBankAccountMappedToWarehouse(a.mappedWarehouseIds, warehouseId, a.status),
  );
}

/** Resolve warehouse label from GRN number (procurement / debit note context). */
export function resolveWarehouseFromGrnNo(grnNo: string | null | undefined): string | null {
  if (!grnNo?.trim() || typeof window === "undefined") return null;
  try {
    const { getGrnRecords } = require("@/app/(app)/warehouse/grn/mock-data") as {
      getGrnRecords: () => Array<{ grnNo: string; warehouse: string }>;
    };
    return getGrnRecords().find((g) => g.grnNo === grnNo.trim())?.warehouse ?? null;
  } catch {
    return null;
  }
}
