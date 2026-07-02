import type { StockMovementEntry, StockProductMeta } from "../types/stock-position";

export const STOCK_PRODUCT_CATALOG: StockProductMeta[] = [
  { productCode: "FER-UR-001", productName: "Urea 50kg", hsn: "3102", scientificName: "Carbamide", category: "Fertilizer", packSize: "50 kg", cp: 280 },
  { productCode: "FER-NPK-002", productName: "NPK 10:26:26", hsn: "3105", scientificName: "NPK Complex", category: "Fertilizer", packSize: "50 kg", cp: 920 },
  { productCode: "SED-MZ-003", productName: "Hybrid Maize Seed", hsn: "1209", scientificName: "Zea mays", category: "Seeds", packSize: "1 kg", cp: 450 },
  { productCode: "FER-DAP-004", productName: "DAP 50kg", hsn: "3105", scientificName: "Diammonium Phosphate", category: "Fertilizer", packSize: "50 kg", cp: 1350 },
  { productCode: "CHEM-ZN-005", productName: "Zinc Sulphate 21%", hsn: "2833", scientificName: "Zinc Sulphate Heptahydrate", category: "Micronutrient", packSize: "25 kg", cp: 180 },
  { productCode: "PRD-004", productName: "Chlorpyrifos 20 EC", hsn: "3808", scientificName: "Chlorpyrifos", category: "Pesticide", packSize: "1 L", cp: 450 },
  { productCode: "PES-MAN-001", productName: "Mancozeb 75% WP", hsn: "3808", scientificName: "Mancozeb", category: "Pesticide", packSize: "500 g", cp: 320 },
  { productCode: "BIO-HUM-001", productName: "Bio Stimulant - Humic Acid", hsn: "3824", scientificName: "Humic Acid", category: "Bio Input", packSize: "5 L", cp: 680 },
];

export interface StockBatchSeed {
  productCode: string;
  batchNumber: string;
  warehouse: string;
  mfgDate: string;
  expiryDate: string;
}

export const STOCK_BATCH_SEEDS: StockBatchSeed[] = [
  { productCode: "FER-UR-001", batchNumber: "B-UR-99A", warehouse: "Central Warehouse", mfgDate: "2025-11-01", expiryDate: "2027-11-01" },
  { productCode: "FER-NPK-002", batchNumber: "B-NPK-12B", warehouse: "Central Warehouse", mfgDate: "2025-12-05", expiryDate: "2027-12-05" },
  { productCode: "SED-MZ-003", batchNumber: "B-MZ-01X", warehouse: "North Zone Hub", mfgDate: "2025-10-10", expiryDate: "2026-10-10" },
  { productCode: "FER-DAP-004", batchNumber: "B-DAP-33C", warehouse: "Central Warehouse", mfgDate: "2025-12-01", expiryDate: "2027-12-01" },
  { productCode: "CHEM-ZN-005", batchNumber: "B-ZN-77Y", warehouse: "Central Warehouse", mfgDate: "2025-11-15", expiryDate: "2027-11-15" },
  { productCode: "FER-UR-001", batchNumber: "B-UR-44X", warehouse: "North Zone Hub", mfgDate: "2025-09-01", expiryDate: "2026-07-15" },
  { productCode: "PRD-004", batchNumber: "B-CP-24A", warehouse: "Central Warehouse", mfgDate: "2024-10-01", expiryDate: "2026-05-01" },
  { productCode: "PES-MAN-001", batchNumber: "B-MAN-26Z", warehouse: "South Zone Depot", mfgDate: "2026-01-20", expiryDate: "2028-01-20" },
  { productCode: "BIO-HUM-001", batchNumber: "B-HUM-26D", warehouse: "West Zone Hub", mfgDate: "2026-03-15", expiryDate: "2028-03-15" },
  { productCode: "SED-MZ-003", batchNumber: "B-MZ-99F", warehouse: "South Zone Depot", mfgDate: "2025-08-01", expiryDate: "2026-04-01" },
];

function daysAgo(n: number, base: string): string {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Build movement ledger relative to as-on base date (today in app). */
export function buildStockMovementLedger(today: string): StockMovementEntry[] {
  const d0 = today;
  const d1 = daysAgo(1, today);
  const d2 = daysAgo(2, today);
  const d3 = daysAgo(3, today);
  const d4 = daysAgo(4, today);
  const d5 = daysAgo(5, today);

  const base: StockMovementEntry[] = [
    { id: "mv-1", dateTime: `${d5}T09:00:00`, productCode: "FER-UR-001", batchNumber: "B-UR-99A", warehouse: "Central Warehouse", transactionType: "Opening Stock Entry", referenceNo: "OPN-2026-001", inQty: 400, outQty: 0 },
    { id: "mv-2", dateTime: `${d3}T11:30:00`, productCode: "FER-UR-001", batchNumber: "B-UR-99A", warehouse: "Central Warehouse", transactionType: "QC Accepted Stock", referenceNo: "QC-2024-001", inQty: 100, outQty: 0 },
    { id: "mv-3", dateTime: `${d2}T14:00:00`, productCode: "FER-UR-001", batchNumber: "B-UR-99A", warehouse: "Central Warehouse", transactionType: "Sales Dispatch", referenceNo: "SO-2026-0142", inQty: 0, outQty: 120 },
    { id: "mv-4", dateTime: `${d1}T10:15:00`, productCode: "FER-UR-001", batchNumber: "B-UR-99A", warehouse: "Central Warehouse", transactionType: "Stock Transfer Out", referenceNo: "ST-2026-008", inQty: 0, outQty: 50 },

    { id: "mv-5", dateTime: `${d5}T09:30:00`, productCode: "FER-NPK-002", batchNumber: "B-NPK-12B", warehouse: "Central Warehouse", transactionType: "Opening Stock Entry", referenceNo: "OPN-2026-002", inQty: 250, outQty: 0 },
    { id: "mv-6", dateTime: `${d2}T16:00:00`, productCode: "FER-NPK-002", batchNumber: "B-NPK-12B", warehouse: "Central Warehouse", transactionType: "QC Accepted Stock", referenceNo: "QC-2024-001", inQty: 50, outQty: 0 },
    { id: "mv-7", dateTime: `${d0}T09:45:00`, productCode: "FER-NPK-002", batchNumber: "B-NPK-12B", warehouse: "Central Warehouse", transactionType: "Sales Dispatch", referenceNo: "SO-2026-0155", inQty: 0, outQty: 80 },

    { id: "mv-8", dateTime: `${d3}T08:00:00`, productCode: "SED-MZ-003", batchNumber: "B-MZ-01X", warehouse: "North Zone Hub", transactionType: "QC Accepted Stock", referenceNo: "QC-2024-002", inQty: 200, outQty: 0 },
    { id: "mv-9", dateTime: `${d1}T13:20:00`, productCode: "SED-MZ-003", batchNumber: "B-MZ-01X", warehouse: "North Zone Hub", transactionType: "Sales Dispatch", referenceNo: "SO-2026-0138", inQty: 0, outQty: 40 },
    { id: "mv-10", dateTime: `${d0}T11:00:00`, productCode: "SED-MZ-003", batchNumber: "B-MZ-01X", warehouse: "North Zone Hub", transactionType: "Sales Return", referenceNo: "SR-2026-003", inQty: 10, outQty: 0 },

    { id: "mv-11", dateTime: `${d5}T10:00:00`, productCode: "FER-DAP-004", batchNumber: "B-DAP-33C", warehouse: "Central Warehouse", transactionType: "Opening Stock Entry", referenceNo: "OPN-2026-003", inQty: 180, outQty: 0 },
    { id: "mv-12", dateTime: `${d0}T15:30:00`, productCode: "FER-DAP-004", batchNumber: "B-DAP-33C", warehouse: "Central Warehouse", transactionType: "Stock Transfer In", referenceNo: "ST-2026-009", inQty: 30, outQty: 0 },

    { id: "mv-13", dateTime: `${d2}T12:00:00`, productCode: "CHEM-ZN-005", batchNumber: "B-ZN-77Y", warehouse: "Central Warehouse", transactionType: "QC Accepted Stock", referenceNo: "QC-2024-003", inQty: 140, outQty: 0 },
    { id: "mv-14", dateTime: `${d0}T08:30:00`, productCode: "CHEM-ZN-005", batchNumber: "B-ZN-77Y", warehouse: "Central Warehouse", transactionType: "Negative Adjustment", referenceNo: "ADJ-2026-002", inQty: 0, outQty: 5 },

    { id: "mv-15", dateTime: `${d4}T09:00:00`, productCode: "FER-UR-001", batchNumber: "B-UR-44X", warehouse: "North Zone Hub", transactionType: "QC Accepted Stock", referenceNo: "QC-2024-001", inQty: 80, outQty: 0 },
    { id: "mv-16", dateTime: `${d0}T10:00:00`, productCode: "FER-UR-001", batchNumber: "B-UR-44X", warehouse: "North Zone Hub", transactionType: "Sales Dispatch", referenceNo: "SO-2026-0160", inQty: 0, outQty: 15 },

    { id: "mv-17", dateTime: `${d1}T09:00:00`, productCode: "PRD-004", batchNumber: "B-CP-24A", warehouse: "Central Warehouse", transactionType: "QC Accepted Stock", referenceNo: "QC-2024-003", inQty: 58, outQty: 0 },
    { id: "mv-18", dateTime: `${d0}T14:00:00`, productCode: "PRD-004", batchNumber: "B-CP-24A", warehouse: "Central Warehouse", transactionType: "Rejected Stock Disposal", referenceNo: "DSP-2026-001", inQty: 0, outQty: 2 },

    { id: "mv-19", dateTime: `${d0}T16:30:00`, productCode: "PES-MAN-001", batchNumber: "B-MAN-26Z", warehouse: "South Zone Depot", transactionType: "Positive Adjustment", referenceNo: "ADJ-2026-003", inQty: 20, outQty: 0 },

    { id: "mv-20", dateTime: `${d3}T11:00:00`, productCode: "BIO-HUM-001", batchNumber: "B-HUM-26D", warehouse: "West Zone Hub", transactionType: "Stock Transfer In", referenceNo: "ST-2026-007", inQty: 60, outQty: 0 },
    { id: "mv-21", dateTime: `${d0}T12:30:00`, productCode: "BIO-HUM-001", batchNumber: "B-HUM-26D", warehouse: "West Zone Hub", transactionType: "Sales Dispatch", referenceNo: "SO-2026-0162", inQty: 0, outQty: 12 },

    { id: "mv-22", dateTime: `${d2}T10:00:00`, productCode: "SED-MZ-003", batchNumber: "B-MZ-99F", warehouse: "South Zone Depot", transactionType: "QC Accepted Stock", referenceNo: "QC-2024-002", inQty: 45, outQty: 0 },
    { id: "mv-23", dateTime: `${d0}T09:00:00`, productCode: "SED-MZ-003", batchNumber: "B-MZ-99F", warehouse: "South Zone Depot", transactionType: "Expired Stock Disposal", referenceNo: "EXP-DSP-001", inQty: 0, outQty: 10 },
  ];

  let sampleIssueEntries: StockMovementEntry[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("ds_sample_issue_movements");
      if (raw) sampleIssueEntries = JSON.parse(raw) as StockMovementEntry[];
    } catch {
      sampleIssueEntries = [];
    }
  }

  return [...base, ...sampleIssueEntries, ...loadStockTransferMovementEntries()];
}

function loadStockTransferMovementEntries(): StockMovementEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ds_stock_transfer_movements");
    return raw ? (JSON.parse(raw) as StockMovementEntry[]) : [];
  } catch {
    return [];
  }
}

