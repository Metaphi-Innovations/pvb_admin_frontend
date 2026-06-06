import { QcRecord } from "../types";

const SEED_QCS: QcRecord[] = [
  {
    id: "qc-1",
    qcNo: "QC-2024-001",
    grnNo: "GRN-2024-001",
    poNumber: "PO-2024-001",
    vendorName: "Agro Chem Distributors",
    inspectionDate: "2024-01-22",
    totalAcceptedQty: 795,
    totalRejectedQty: 5,
    status: "completed",
    qcRemarks: "Minor bag damage on 5 units. Balance cleared for stock.",
    items: [
      { productId: "1", productName: "Urea 50kg", batchNumber: "B-UR-99A", receivedQty: 500, acceptedQty: 498, rejectedQty: 2, rejectionReason: "Bag tear" },
      { productId: "2", productName: "NPK 10:26:26", batchNumber: "B-NPK-12B", receivedQty: 300, acceptedQty: 297, rejectedQty: 3, rejectionReason: "Moisture exposure" },
    ],
  },
  {
    id: "qc-2",
    qcNo: "QC-2024-002",
    grnNo: "GRN-2024-002",
    poNumber: "PO-2024-002",
    vendorName: "Seed Corp India Pvt Ltd",
    inspectionDate: "2024-01-26",
    totalAcceptedQty: 200,
    totalRejectedQty: 0,
    status: "completed",
    items: [
      { productId: "3", productName: "Hybrid Maize Seed", batchNumber: "B-MZ-01X", receivedQty: 200, acceptedQty: 200, rejectedQty: 0 },
    ],
  },
  {
    id: "qc-3",
    qcNo: "QC-2024-003",
    grnNo: "GRN-2024-004",
    poNumber: "PO-2024-0001",
    vendorName: "Agro Chem Distributors",
    inspectionDate: "2024-01-29",
    totalAcceptedQty: 58,
    totalRejectedQty: 2,
    status: "completed",
    qcRemarks: "2 units rejected due to leakage. Balance accepted into stock.",
    items: [
      { productId: "4", productName: "Chlorpyrifos 20 EC", batchNumber: "B-CP-24A", receivedQty: 60, acceptedQty: 58, rejectedQty: 2, rejectionReason: "Leakage" },
    ],
  },
];

const LOCAL_STORAGE_KEY = "ds_qc_records_v2";

function mergeSeedQcs(stored: QcRecord[]): QcRecord[] {
  const byId = new Map(stored.map((q) => [q.id, q]));
  for (const seed of SEED_QCS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return Array.from(byId.values());
}

export function getQcRecords(): QcRecord[] {
  if (typeof window === "undefined") return SEED_QCS;
  const legacy = localStorage.getItem("ds_qc_records");
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const base = legacy ? mergeSeedQcs(JSON.parse(legacy) as QcRecord[]) : SEED_QCS;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(base));
    return base;
  }
  const merged = mergeSeedQcs(JSON.parse(stored) as QcRecord[]);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  return merged;
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
