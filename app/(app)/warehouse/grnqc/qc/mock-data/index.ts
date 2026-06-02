import { QcRecord } from "../types";

const SEED_QCS: QcRecord[] = [
  {
    id: "qc-1",
    qcNo: "QC-2024-001",
    grnNo: "GRN-2024-001",
    vendorName: "Agro Chem Distributors",
    inspectionDate: "2024-01-22",
    totalAcceptedQty: 795,
    totalRejectedQty: 5,
    status: "completed",
    items: [
      { productId: "1", productName: "Urea 50kg", batchNumber: "B-UR-99A", receivedQty: 500, acceptedQty: 498, rejectedQty: 2, rejectionReason: "Bag tear" },
      { productId: "2", productName: "NPK 10:26:26", batchNumber: "B-NPK-12B", receivedQty: 300, acceptedQty: 297, rejectedQty: 3, rejectionReason: "Moisture exposure" },
    ],
  },
  {
    id: "qc-2",
    qcNo: "QC-2024-002",
    grnNo: "GRN-2024-002",
    vendorName: "Seed Corp India Pvt Ltd",
    inspectionDate: "2024-01-26",
    totalAcceptedQty: 200,
    totalRejectedQty: 0,
    status: "completed",
    items: [
      { productId: "3", productName: "Hybrid Maize Seed", batchNumber: "B-MZ-01X", receivedQty: 200, acceptedQty: 200, rejectedQty: 0 },
    ],
  },
];

const LOCAL_STORAGE_KEY = "ds_qc_records";

export function getQcRecords(): QcRecord[] {
  if (typeof window === "undefined") return SEED_QCS;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_QCS));
    return SEED_QCS;
  }
  return JSON.parse(stored);
}

export function saveQcRecord(record: QcRecord): void {
  if (typeof window === "undefined") return;
  const records = getQcRecords();
  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.unshift(record);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
}

export function getQcById(id: string): QcRecord | undefined {
  return getQcRecords().find(r => r.id === id);
}
