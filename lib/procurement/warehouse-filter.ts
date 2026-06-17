import { loadWarehouses, type WarehouseMaster } from "@/app/(app)/masters/warehouse/warehouse-data";

export function getActiveWarehouseStates(): string[] {
  const states = new Set<string>();
  for (const w of loadWarehouses()) {
    if (w.status === "active" && w.state) states.add(w.state);
  }
  return Array.from(states).sort((a, b) => a.localeCompare(b));
}

export function getWarehousesForState(state: string): WarehouseMaster[] {
  const all = loadWarehouses().filter((w) => w.status === "active");
  if (!state) return all;
  return all.filter((w) => w.state === state);
}

export function warehouseSelectOptions(state: string): { value: string; label: string }[] {
  return getWarehousesForState(state).map((w) => ({
    value: String(w.id),
    label: `${w.warehouseName} (${w.warehouseCode})`,
  }));
}

export function stateSelectOptions(): { value: string; label: string }[] {
  return getActiveWarehouseStates().map((s) => ({ value: s, label: s }));
}
