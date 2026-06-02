import { PurchaseOrder, GrnRecord, ProductItem } from "../types";

export const MOCK_PRODUCTS: ProductItem[] = [
  { id: "1", name: "Urea 50kg", code: "FER-UR-001", uom: "BAG" },
  { id: "2", name: "NPK 10:26:26", code: "FER-NPK-002", uom: "BAG" },
  { id: "3", name: "Hybrid Maize Seed", code: "SED-MZ-003", uom: "KG" },
  { id: "4", name: "DAP 50kg", code: "FER-DAP-004", uom: "BAG" },
  { id: "5", name: "Zinc Sulphate 21%", code: "CHEM-ZN-005", uom: "KG" },
];

export const MOCK_POS: PurchaseOrder[] = [
  {
    poNumber: "PO-2024-001",
    vendorName: "Agro Chem Distributors",
    items: [
      { productId: "1", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 500 },
      { productId: "2", productName: "NPK 10:26:26", productCode: "FER-NPK-002", orderedQty: 300 },
    ],
  },
  {
    poNumber: "PO-2024-002",
    vendorName: "Seed Corp India Pvt Ltd",
    items: [
      { productId: "3", productName: "Hybrid Maize Seed", productCode: "SED-MZ-003", orderedQty: 200 },
    ],
  },
  {
    poNumber: "PO-2024-003",
    vendorName: "Fertilizer World",
    items: [
      { productId: "4", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 400 },
      { productId: "5", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", orderedQty: 150 },
    ],
  },
];

const SEED_GRNS: GrnRecord[] = [
  {
    id: "grn-1",
    grnNo: "GRN-2024-001",
    poNumber: "PO-2024-001",
    vendorName: "Agro Chem Distributors",
    warehouse: "Central Warehouse",
    grnDate: "2024-01-20",
    totalProducts: 2,
    totalQty: 800,
    status: "qc_completed",
    items: [
      { productId: "1", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 500, receivedQty: 500 },
      { productId: "2", productName: "NPK 10:26:26", productCode: "FER-NPK-002", orderedQty: 300, receivedQty: 300 },
    ],
    batches: [
      { productId: "1", productName: "Urea 50kg", batchNumber: "B-UR-99A", mfgDate: "2023-11-01", expDate: "2025-11-01", quantity: 500 },
      { productId: "2", productName: "NPK 10:26:26", batchNumber: "B-NPK-12B", mfgDate: "2023-12-05", expDate: "2025-12-05", quantity: 300 },
    ],
  },
  {
    id: "grn-2",
    grnNo: "GRN-2024-002",
    poNumber: "PO-2024-002",
    vendorName: "Seed Corp India Pvt Ltd",
    warehouse: "North Zone Hub",
    grnDate: "2024-01-25",
    totalProducts: 1,
    totalQty: 200,
    status: "qc_completed",
    items: [
      { productId: "3", productName: "Hybrid Maize Seed", productCode: "SED-MZ-003", orderedQty: 200, receivedQty: 200 },
    ],
    batches: [
      { productId: "3", productName: "Hybrid Maize Seed", batchNumber: "B-MZ-01X", mfgDate: "2023-10-10", expDate: "2024-10-10", quantity: 200 },
    ],
  },
  {
    id: "grn-3",
    grnNo: "GRN-2024-003",
    poNumber: "PO-2024-003",
    vendorName: "Fertilizer World",
    warehouse: "Central Warehouse",
    grnDate: "2024-02-06",
    totalProducts: 2,
    totalQty: 520,
    status: "qc_pending",
    items: [
      { productId: "4", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 400, receivedQty: 380 },
      { productId: "5", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", orderedQty: 150, receivedQty: 140 },
    ],
    batches: [
      { productId: "4", productName: "DAP 50kg", batchNumber: "B-DAP-33C", mfgDate: "2023-12-01", expDate: "2025-12-01", quantity: 380 },
      { productId: "5", productName: "Zinc Sulphate 21%", batchNumber: "B-ZN-77Y", mfgDate: "2023-11-15", expDate: "2025-11-15", quantity: 140 },
    ],
  },
];

const LOCAL_STORAGE_KEY = "ds_grn_records";

export function getGrnRecords(): GrnRecord[] {
  if (typeof window === "undefined") return SEED_GRNS;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_GRNS));
    return SEED_GRNS;
  }
  return JSON.parse(stored);
}

export function saveGrnRecord(record: GrnRecord): void {
  if (typeof window === "undefined") return;
  const records = getGrnRecords();
  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.unshift(record);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
}

export function getGrnById(id: string): GrnRecord | undefined {
  return getGrnRecords().find(r => r.id === id);
}

export function getGrnByNo(grnNo: string): GrnRecord | undefined {
  return getGrnRecords().find(r => r.grnNo === grnNo);
}
