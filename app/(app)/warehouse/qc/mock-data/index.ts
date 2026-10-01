import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import { QcItem, QcRecord, QcStatus } from "../types";

function buildQcItemsFromGrn(grn: GrnRecord, qtyDefaults?: Partial<Pick<QcItem, "acceptedQty" | "rejectedQty" | "holdQty">>): QcItem[] {
  return grn.batches.map((b) => ({
    productId: b.productId,
    productName: b.productName,
    productCode: b.productCode,
    batchNumber: b.batchNumber,
    receivedQty: b.quantity,
    acceptedQty: qtyDefaults?.acceptedQty ?? 0,
    rejectedQty: qtyDefaults?.rejectedQty ?? 0,
    holdQty: qtyDefaults?.holdQty ?? 0,
  }));
}

function sumReceived(items: QcItem[]) {
  return items.reduce((s, it) => s + it.receivedQty, 0);
}

function normalizeQcStatus(status: string): QcStatus {
  if (status === "completed") return "completed";
  return "pending";
}

function normalizeQcRecord(record: QcRecord): QcRecord {
  const status = normalizeQcStatus(record.status as string);
  const items = record.items.map((it) => ({
    ...it,
    holdQty: it.holdQty ?? 0,
  }));
  const totalReceivedQty = record.totalReceivedQty ?? sumReceived(items);
  return {
    ...record,
    warehouse: record.warehouse ?? "Central Warehouse",
    inspectionDate: status === "completed" ? (record.inspectionDate ?? "") : "",
    status,
    items,
    totalReceivedQty,
    totalAcceptedQty: status === "completed" ? (record.totalAcceptedQty ?? items.reduce((s, it) => s + it.acceptedQty, 0)) : 0,
    totalRejectedQty: status === "completed" ? (record.totalRejectedQty ?? items.reduce((s, it) => s + it.rejectedQty, 0)) : 0,
    totalHoldQty: status === "completed" ? (record.totalHoldQty ?? items.reduce((s, it) => s + (it.holdQty ?? 0), 0)) : 0,
  };
}

const SEED_QCS: QcRecord[] = [
  // ── Pending QC (3) ───────────────────────────────────────────────────────
  {
    id: "qc-pending-1",
    qcNo: "QC-2024-101",
    grnId: "grn-3",
    grnNo: "GRN-2024-003",
    poNumber: "PO-2024-003",
    vendorName: "Fertilizer World",
    warehouse: "Central Warehouse",
    inspectionDate: "",
    totalReceivedQty: 520,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    items: [
      { productId: "4", productName: "DAP 50kg", productCode: "FER-DAP-004", batchNumber: "B-DAP-33C", receivedQty: 380, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
      { productId: "5", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", batchNumber: "B-ZN-77Y", receivedQty: 140, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
    ],
  },
  {
    id: "qc-pending-2",
    qcNo: "QC-2024-102",
    grnId: "grn-5",
    grnNo: "GRN-2024-005",
    poNumber: "PO-2024-005",
    vendorName: "Agro Chem Distributors",
    warehouse: "North Zone Hub",
    inspectionDate: "",
    totalReceivedQty: 150,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    items: [
      { productId: "6", productName: "Imidacloprid 17.8% SL", productCode: "PES-IMI-002", batchNumber: "B-IMI-26A", receivedQty: 150, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
    ],
  },
  {
    id: "qc-pending-3",
    qcNo: "QC-2024-103",
    grnId: "grn-6",
    grnNo: "GRN-2024-006",
    poNumber: "PO-2024-006",
    vendorName: "Seed Corp India Pvt Ltd",
    warehouse: "South Zone Depot",
    inspectionDate: "",
    totalReceivedQty: 320,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    items: [
      { productId: "7", productName: "Hybrid Paddy Seed 5kg", productCode: "SED-PD-001", batchNumber: "B-PD-26X", receivedQty: 200, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
      { productId: "8", productName: "Bio Fungicide", productCode: "BIO-FG-003", batchNumber: "B-BF-26Y", receivedQty: 120, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
    ],
  },
  // ── Pending QC (2 more) ───────────────────────────────────────────────────
  {
    id: "qc-pending-4",
    qcNo: "QC-2024-201",
    grnId: "grn-7",
    grnNo: "GRN-2024-007",
    poNumber: "PO-2024-007",
    vendorName: "Kisan Inputs Pvt Ltd",
    warehouse: "Central Warehouse",
    inspectionDate: "",
    totalReceivedQty: 280,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    items: [
      { productId: "9", productName: "Mancozeb 75% WP", productCode: "PES-MAN-001", batchNumber: "B-MAN-26Z", receivedQty: 280, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
    ],
  },
  {
    id: "qc-pending-5",
    qcNo: "QC-2024-202",
    grnId: "grn-8",
    grnNo: "GRN-2024-008",
    poNumber: "PO-2024-008",
    vendorName: "Bharat Fertilizers",
    warehouse: "West Zone Hub",
    inspectionDate: "",
    totalReceivedQty: 450,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    items: [
      { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", batchNumber: "B-UR-26Q", receivedQty: 300, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
      { productId: "11", productName: "NPK 10:26:26", productCode: "FER-NPK-002", batchNumber: "B-NPK-26Q", receivedQty: 150, acceptedQty: 0, rejectedQty: 0, holdQty: 0 },
    ],
  },
  // ── Completed (3) ────────────────────────────────────────────────────────
  {
    id: "qc-1",
    qcNo: "QC-2024-001",
    grnId: "grn-1",
    grnNo: "GRN-2024-001",
    poNumber: "PO-2024-001",
    vendorName: "Agro Chem Distributors",
    warehouse: "Central Warehouse",
    inspectionDate: "2024-01-22",
    totalReceivedQty: 800,
    totalAcceptedQty: 795,
    totalRejectedQty: 5,
    totalHoldQty: 0,
    status: "completed",
    qcResult: "partial",
    qcRemarks: "Minor bag damage on 5 units. Balance cleared for stock.",
    items: [
      { productId: "1", productName: "Urea 50kg", productCode: "FER-UR-001", batchNumber: "B-UR-99A", receivedQty: 500, acceptedQty: 498, rejectedQty: 2, holdQty: 0, rejectionReason: "Bag tear" },
      { productId: "2", productName: "NPK 10:26:26", productCode: "FER-NPK-002", batchNumber: "B-NPK-12B", receivedQty: 300, acceptedQty: 297, rejectedQty: 3, holdQty: 0, rejectionReason: "Moisture exposure" },
    ],
  },
  {
    id: "qc-2",
    qcNo: "QC-2024-002",
    grnId: "grn-2",
    grnNo: "GRN-2024-002",
    poNumber: "PO-2024-002",
    vendorName: "Seed Corp India Pvt Ltd",
    warehouse: "North Zone Hub",
    inspectionDate: "2024-01-26",
    totalReceivedQty: 200,
    totalAcceptedQty: 200,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "completed",
    qcResult: "passed",
    items: [
      { productId: "3", productName: "Hybrid Maize Seed", productCode: "SED-MZ-003", batchNumber: "B-MZ-01X", receivedQty: 200, acceptedQty: 200, rejectedQty: 0, holdQty: 0 },
    ],
  },
  {
    id: "qc-3",
    qcNo: "QC-2024-003",
    grnId: "grn-4",
    grnNo: "GRN-2024-004",
    poNumber: "PO-2024-0001",
    vendorName: "Agro Chem Distributors",
    warehouse: "Central Warehouse",
    inspectionDate: "2024-01-29",
    totalReceivedQty: 60,
    totalAcceptedQty: 58,
    totalRejectedQty: 2,
    totalHoldQty: 0,
    status: "completed",
    qcResult: "partial",
    qcRemarks: "2 units rejected due to leakage. Balance accepted into stock.",
    items: [
      { productId: "4", productName: "Chlorpyrifos 20 EC", productCode: "PRD-004", batchNumber: "B-CP-24A", receivedQty: 60, acceptedQty: 58, rejectedQty: 2, holdQty: 0, rejectionReason: "Leakage" },
    ],
  },
];

const LOCAL_STORAGE_KEY = "ds_qc_records_v4";

function mergeSeedQcs(stored: QcRecord[]): QcRecord[] {
  const byId = new Map(stored.map((q) => [q.id, q]));
  for (const seed of SEED_QCS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return Array.from(byId.values()).map(normalizeQcRecord);
}

export function getQcRecords(): QcRecord[] {
  if (typeof window === "undefined") return SEED_QCS.map(normalizeQcRecord);
  const legacy =
    localStorage.getItem("ds_qc_records") ??
    localStorage.getItem("ds_qc_records_v2") ??
    localStorage.getItem("ds_qc_records_v3");
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const base = legacy ? mergeSeedQcs(JSON.parse(legacy) as QcRecord[]) : SEED_QCS.map(normalizeQcRecord);
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
  const normalized = normalizeQcRecord(record);
  const index = records.findIndex((r) => r.id === normalized.id);
  if (index >= 0) {
    records[index] = normalized;
  } else {
    records.unshift(normalized);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
}

export function getQcById(id: string): QcRecord | undefined {
  return getQcRecords().find((r) => r.id === id);
}

export function getQcByGrnNo(grnNo: string): QcRecord | undefined {
  return getQcRecords().find((r) => r.grnNo === grnNo);
}

export function getNextQcNo(): string {
  const records = getQcRecords();
  const maxNum = records.reduce((max, q) => {
    const match = q.qcNo.match(/QC-\d{4}-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `QC-2024-${(maxNum + 1).toString().padStart(3, "0")}`;
}

export function createQcFromGrn(grn: GrnRecord): QcRecord {
  const existing = getQcByGrnNo(grn.grnNo);
  if (existing) return existing;

  const items = buildQcItemsFromGrn(grn);
  const qc: QcRecord = {
    id: `qc-${Date.now()}`,
    qcNo: getNextQcNo(),
    grnId: grn.id,
    grnNo: grn.grnNo,
    poNumber: grn.poNumber,
    vendorName: grn.vendorName,
    warehouse: grn.warehouse,
    sourceType: grn.sourceType === "stock_transfer" ? "stock_transfer" : "purchase_order",
    stockTransferNo: grn.stockTransferNo,
    fromWarehouse: grn.fromWarehouse,
    toWarehouse: grn.toWarehouse ?? grn.warehouse,
    inspectionDate: "",
    totalReceivedQty: sumReceived(items),
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    totalHoldQty: 0,
    status: "pending",
    items,
  };

  saveQcRecord(qc);
  return qc;
}
