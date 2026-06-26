import { DispatchRecord, DeliveryDetails } from "../types";
import { getDispatchRecords, saveDispatchRecords } from "../mock-data";
import { PackingRecord } from "../../packing/types";
import { getPackingRecordsList } from "../../packing/services";
import { getPackingRecords, savePackingRecords } from "../../packing/mock-data";
import { loadTransfers, saveTransfers } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";

export function getDispatchesByWarehouse(warehouse: string = "All"): DispatchRecord[] {
  const dispatches = getDispatchRecords();
  if (warehouse === "All") return dispatches;
  return dispatches.filter(d => d.warehouse === warehouse);
}

export function getDispatchById(id: string): DispatchRecord | undefined {
  return getDispatchRecords().find(d => d.id === id);
}

export function getPackedOrdersByWarehouse(warehouse: string = "All"): PackingRecord[] {
  const packings = getPackingRecordsList();
  const filtered = warehouse === "All" ? packings : packings.filter(p => p.warehouse === warehouse || p.sourceWarehouse === warehouse);
  // Only return "Packed" status orders (not yet dispatched)
  return filtered.filter(p => p.status === "Packed");
}

export function saveDispatch(record: DispatchRecord): void {
  const dispatches = getDispatchRecords();
  const idx = dispatches.findIndex(d => d.id === record.id);
  if (idx === -1) {
    dispatches.push(record);
    
    // Mark packing record(s) as Dispatched
    if (record.packingNumbers && record.packingNumbers.length > 0) {
      const packingList = getPackingRecords();
      const transfers = loadTransfers();
      let packingUpdated = false;
      let transfersUpdated = false;

      record.packingNumbers.forEach(pNo => {
        // Check standard packing records
        const pIdx = packingList.findIndex(p => p.packingNo === pNo);
        if (pIdx !== -1) {
          packingList[pIdx].status = "Dispatched";
          packingUpdated = true;
        }

        // Check stock transfers
        const tIdx = transfers.findIndex(t => t.packingListNumber === pNo);
        if (tIdx !== -1) {
          transfers[tIdx].packingStatus = "Dispatched";
          transfersUpdated = true;
        }
      });

      if (packingUpdated) savePackingRecords(packingList);
      if (transfersUpdated) saveTransfers(transfers);
    }
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
