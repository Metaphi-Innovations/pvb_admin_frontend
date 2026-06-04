import { DispatchRecord, DeliveryDetails } from "../types";
import { getDispatchRecords, saveDispatchRecords } from "../mock-data";
import { getPackingRecords } from "../../packing/mock-data";
import { PackingRecord } from "../../packing/types";

export function getDispatchesByWarehouse(warehouse: string = "All"): DispatchRecord[] {
  const dispatches = getDispatchRecords();
  if (warehouse === "All") return dispatches;
  return dispatches.filter(d => d.warehouse === warehouse);
}

export function getDispatchById(id: string): DispatchRecord | undefined {
  return getDispatchRecords().find(d => d.id === id);
}

export function getPackedOrdersByWarehouse(warehouse: string = "All"): PackingRecord[] {
  const packings = getPackingRecords();
  const filtered = warehouse === "All" ? packings : packings.filter(p => p.warehouse === warehouse);
  // Only return "Packed" status orders (not yet dispatched)
  return filtered.filter(p => p.status === "Packed");
}

export function saveDispatch(record: DispatchRecord): void {
  const dispatches = getDispatchRecords();
  const idx = dispatches.findIndex(d => d.id === record.id);
  if (idx === -1) {
    dispatches.push(record);
  } else {
    dispatches[idx] = record;
  }
  saveDispatchRecords(dispatches);
}

export function revertDispatch(id: string): boolean {
  const dispatches = getDispatchRecords();
  const idx = dispatches.findIndex(d => d.id === id);
  if (idx === -1) return false;

  if (dispatches[idx].deliveryStatus === "Delivered") return false;

  dispatches.splice(idx, 1);
  saveDispatchRecords(dispatches);
  return true;
}

export function markAsDelivered(id: string, deliveryDetails: DeliveryDetails): boolean {
  const dispatches = getDispatchRecords();
  const idx = dispatches.findIndex(d => d.id === id);
  if (idx === -1) return false;

  dispatches[idx] = {
    ...dispatches[idx],
    deliveryStatus: "Delivered",
    deliveryDetails,
  };
  saveDispatchRecords(dispatches);
  return true;
}

export function generateDispatchNumber(): string {
  const dispatches = getDispatchRecords();
  return `DSP-2026-${String(dispatches.length + 1).padStart(3, "0")}`;
}
