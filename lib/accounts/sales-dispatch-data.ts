/**
 * Dispatch records linked to sales orders (demo / localStorage-free static data).
 */

export interface SalesDispatchRecord {
  id: number;
  dispatchNo: string;
  soNumber: string;
  customerName: string;
  branch: string;
  warehouse: string;
  territory: string;
  status: "scheduled" | "in-transit" | "delivered" | "failed";
  dispatchDate: string;
}

const DISPATCHES: SalesDispatchRecord[] = [
  {
    id: 1,
    dispatchNo: "DSP-001",
    soNumber: "SO-001",
    customerName: "ABC Agro Distributor",
    branch: "Head Office",
    warehouse: "Central Warehouse",
    territory: "North Zone",
    status: "delivered",
    dispatchDate: "2026-06-05",
  },
  {
    id: 2,
    dispatchNo: "DSP-002",
    soNumber: "SO-002",
    customerName: "ABC Agro Distributor",
    branch: "Head Office",
    warehouse: "Central Warehouse",
    territory: "North Zone",
    status: "delivered",
    dispatchDate: "2026-06-12",
  },
];

export function getDispatchForSalesOrder(soNumber: string): SalesDispatchRecord | null {
  return DISPATCHES.find((d) => d.soNumber === soNumber) ?? null;
}

export function getDispatchByNo(dispatchNo: string): SalesDispatchRecord | null {
  return DISPATCHES.find((d) => d.dispatchNo === dispatchNo) ?? null;
}
