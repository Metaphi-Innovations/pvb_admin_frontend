import { PurchaseOrder, GrnRecord, ProductItem, GrnItem, GrnBatch } from "../types";

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
    status: "approved",
    items: [
      { productId: "1", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 500 },
      { productId: "2", productName: "NPK 10:26:26", productCode: "FER-NPK-002", orderedQty: 300 },
    ],
  },
  {
    poNumber: "PO-2024-002",
    vendorName: "Seed Corp India Pvt Ltd",
    status: "approved",
    items: [
      { productId: "3", productName: "Hybrid Maize Seed", productCode: "SED-MZ-003", orderedQty: 200 },
    ],
  },
  {
    poNumber: "PO-2024-0001",
    vendorName: "Agro Chem Distributors",
    status: "approved",
    items: [
      { productId: "4", productName: "Chlorpyrifos 20 EC", productCode: "PRD-004", orderedQty: 100 },
    ],
  },
  {
    poNumber: "PO-2024-003",
    vendorName: "Fertilizer World",
    status: "approved",
    items: [
      { productId: "4", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 400 },
      { productId: "5", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", orderedQty: 150 },
    ],
  },
  {
    poNumber: "PO-2024-004",
    vendorName: "Agro Chem Distributors",
    status: "pending",
    items: [
      { productId: "1", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 100 },
    ],
  },
];

const SEED_GRNS: GrnRecord[] = [
  // ── Demo GRNs for Accounts Purchase Invoice module ──────────────────────
  {
    id: "demo-grn-1",
    grnNo: "GRN-001",
    poNumber: "PO-2026-001",
    poId: 1001,
    vendorName: "AgroChem Traders",
    vendorReference: "AC/26/101",
    warehouse: "Central Warehouse",
    grnDate: "2026-04-10",
    totalProducts: 2,
    totalQty: 600,
    status: "qc_completed",
    items: [
      { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 400, receivedQty: 400, unit: "BAG" },
      { productId: "11", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 200, receivedQty: 200, unit: "BAG" },
    ],
    batches: [
      { productId: "10", productName: "Urea 50kg", batchNumber: "BURA-26A", mfgDate: "2026-02-01", expDate: "2028-02-01", quantity: 400 },
      { productId: "11", productName: "DAP 50kg", batchNumber: "BDAP-26A", mfgDate: "2026-02-15", expDate: "2028-02-15", quantity: 200 },
    ],
    createdBy: "Admin",
  },
  {
    id: "demo-grn-2",
    grnNo: "GRN-002",
    poNumber: "PO-2026-002",
    poId: 1002,
    vendorName: "GreenField Suppliers",
    vendorReference: "GF/26/55",
    warehouse: "North Zone Hub",
    grnDate: "2026-04-17",
    totalProducts: 2,
    totalQty: 350,
    status: "qc_completed",
    items: [
      { productId: "12", productName: "NPK 10:26:26", productCode: "FER-NPK-002", orderedQty: 250, receivedQty: 250, unit: "BAG" },
      { productId: "13", productName: "Pesticide - Chlorpyrifos 20EC", productCode: "PES-CHL-001", orderedQty: 100, receivedQty: 100, unit: "LTR" },
    ],
    batches: [
      { productId: "12", productName: "NPK 10:26:26", batchNumber: "BNPK-26B", mfgDate: "2026-03-01", expDate: "2028-03-01", quantity: 250 },
      { productId: "13", productName: "Pesticide - Chlorpyrifos 20EC", batchNumber: "BCHL-26B", mfgDate: "2026-01-10", expDate: "2027-01-10", quantity: 100 },
    ],
    createdBy: "Admin",
  },
  {
    id: "demo-grn-3",
    grnNo: "GRN-003",
    poNumber: "PO-2026-003",
    poId: 1003,
    vendorName: "Bharat Fertilizers",
    vendorReference: "BF/26/77",
    warehouse: "Central Warehouse",
    grnDate: "2026-05-02",
    totalProducts: 2,
    totalQty: 500,
    status: "qc_completed",
    items: [
      { productId: "14", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", orderedQty: 200, receivedQty: 200, unit: "KG" },
      { productId: "15", productName: "Hybrid Maize Seed 1kg", productCode: "SED-MZ-003", orderedQty: 300, receivedQty: 300, unit: "PKT" },
    ],
    batches: [
      { productId: "14", productName: "Zinc Sulphate 21%", batchNumber: "BZN-26C", mfgDate: "2026-02-20", expDate: "2028-02-20", quantity: 200 },
      { productId: "15", productName: "Hybrid Maize Seed 1kg", batchNumber: "BMZ-26C", mfgDate: "2025-10-01", expDate: "2026-10-01", quantity: 300 },
    ],
    createdBy: "Admin",
  },
  {
    id: "demo-grn-4",
    grnNo: "GRN-004",
    poNumber: "PO-2026-004",
    poId: 1004,
    vendorName: "Kisan Inputs Pvt Ltd",
    vendorReference: "KIP/26/33",
    warehouse: "South Zone Depot",
    grnDate: "2026-05-10",
    totalProducts: 2,
    totalQty: 400,
    status: "qc_completed",
    items: [
      { productId: "16", productName: "Bio Stimulant - Humic Acid", productCode: "BIO-HUM-001", orderedQty: 150, receivedQty: 150, unit: "LTR" },
      { productId: "17", productName: "Micronutrient Mix Powder", productCode: "MICRO-MIX-002", orderedQty: 250, receivedQty: 250, unit: "KG" },
    ],
    batches: [
      { productId: "16", productName: "Bio Stimulant - Humic Acid", batchNumber: "BHUM-26D", mfgDate: "2026-03-15", expDate: "2028-03-15", quantity: 150 },
      { productId: "17", productName: "Micronutrient Mix Powder", batchNumber: "BMIX-26D", mfgDate: "2026-04-01", expDate: "2028-04-01", quantity: 250 },
    ],
    createdBy: "Admin",
  },
  {
    id: "demo-grn-5",
    grnNo: "GRN-005",
    poNumber: "PO-2026-005",
    poId: 1005,
    vendorName: "Crop Care Industries",
    vendorReference: "CCI/26/19",
    warehouse: "Central Warehouse",
    grnDate: "2026-05-18",
    totalProducts: 2,
    totalQty: 300,
    status: "qc_completed",
    items: [
      { productId: "18", productName: "Imidacloprid 17.8% SL", productCode: "PES-IMI-003", orderedQty: 120, receivedQty: 120, unit: "LTR" },
      { productId: "19", productName: "Mancozeb 75% WP", productCode: "PES-MAN-004", orderedQty: 180, receivedQty: 180, unit: "KG" },
    ],
    batches: [
      { productId: "18", productName: "Imidacloprid 17.8% SL", batchNumber: "BIMI-26E", mfgDate: "2026-01-15", expDate: "2028-01-15", quantity: 120 },
      { productId: "19", productName: "Mancozeb 75% WP", batchNumber: "BMAN-26E", mfgDate: "2026-02-10", expDate: "2028-02-10", quantity: 180 },
    ],
    createdBy: "Admin",
  },
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
      { productId: "1", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 500, receivedQty: 500, unit: "BAG" },
      { productId: "2", productName: "NPK 10:26:26", productCode: "FER-NPK-002", orderedQty: 300, receivedQty: 300, unit: "BAG" },
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
      { productId: "3", productName: "Hybrid Maize Seed", productCode: "SED-MZ-003", orderedQty: 200, receivedQty: 200, unit: "KG" },
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
      { productId: "4", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 400, receivedQty: 380, unit: "BAG" },
      { productId: "5", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", orderedQty: 150, receivedQty: 140, unit: "KG" },
    ],
    batches: [
      { productId: "4", productName: "DAP 50kg", batchNumber: "B-DAP-33C", mfgDate: "2023-12-01", expDate: "2025-12-01", quantity: 380 },
      { productId: "5", productName: "Zinc Sulphate 21%", batchNumber: "B-ZN-77Y", mfgDate: "2023-11-15", expDate: "2025-11-15", quantity: 140 },
    ],
  },
  {
    id: "grn-4",
    grnNo: "GRN-2024-004",
    poNumber: "PO-2024-0001",
    vendorName: "Agro Chem Distributors",
    vendorReference: "REF/AC/25",
    warehouse: "Central Warehouse",
    grnDate: "2024-01-28",
    totalProducts: 1,
    totalQty: 60,
    status: "qc_completed",
    items: [
      { productId: "4", productName: "Chlorpyrifos 20 EC", productCode: "PRD-004", orderedQty: 100, receivedQty: 60, unit: "LTR", batchNumber: "B-CP-24A", mfgDate: "2023-10-01", expDate: "2025-10-01", inventoryTracked: true },
    ],
    batches: [
      { productId: "4", productName: "Chlorpyrifos 20 EC", batchNumber: "B-CP-24A", mfgDate: "2023-10-01", expDate: "2025-10-01", quantity: 60 },
    ],
  },
];

const LOCAL_STORAGE_KEY = "ds_grn_records_v2";

function mergeSeedGrns(stored: GrnRecord[]): GrnRecord[] {
  const byId = new Map(stored.map((g) => [g.id, g]));
  for (const seed of SEED_GRNS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return Array.from(byId.values());
}

export function getGrnRecords(): GrnRecord[] {
  if (typeof window === "undefined") return SEED_GRNS;
  const legacy = localStorage.getItem("ds_grn_records");
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const base = legacy ? mergeSeedGrns(JSON.parse(legacy) as GrnRecord[]) : SEED_GRNS;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(base));
    return base;
  }
  const merged = mergeSeedGrns(JSON.parse(stored) as GrnRecord[]);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  return merged;
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

/** Sum qty already received for a PO line from non-draft GRNs */
export function getAlreadyReceivedQty(poNumber: string, productId: string): number {
  const records = getGrnRecords();
  let total = 0;
  for (const grn of records) {
    if (grn.status === "draft") continue;
    const poNumbers = grn.poNumber.split(",").map((s) => s.trim());
    if (!poNumbers.includes(poNumber)) continue;
    for (const item of grn.items) {
      if (item.productId === productId && (!item.poNumber || item.poNumber === poNumber)) {
        total += item.receivedQty;
      }
    }
  }
  return total;
}

/** Approved POs for vendor with at least one line still pending receipt */
export function getEligiblePosForVendor(vendorName: string): PurchaseOrder[] {
  return MOCK_POS.filter((po) => {
    if (po.vendorName !== vendorName || po.status !== "approved") return false;
    return po.items.some((it) => {
      const received = getAlreadyReceivedQty(po.poNumber, it.productId);
      return it.orderedQty - received > 0;
    });
  });
}

/** Mock OCR extraction — one batch row set per uploaded invoice file */
export function mockExtractInvoiceBatchesFromFiles(
  files: { id: string; name: string }[],
  items: GrnItem[],
): GrnBatch[] {
  const activeItems = items.filter((it) => it.receivedQty > 0);
  if (files.length === 0 || activeItems.length === 0) return [];

  const today = new Date();
  const batches: GrnBatch[] = [];

  files.forEach((file, fileIdx) => {
    const baseName = file.name.replace(/\.[^.]+$/, "").trim();
    const invoiceNumber = baseName || `INV-${String(fileIdx + 1).padStart(3, "0")}`;
    const invDate = new Date(today);
    invDate.setDate(invDate.getDate() - fileIdx * 3);
    const invoiceDate = invDate.toISOString().slice(0, 10);

    const mfg = new Date(today);
    mfg.setMonth(mfg.getMonth() - 2 - fileIdx);
    const exp = new Date(today);
    exp.setFullYear(exp.getFullYear() + 2);
    const mfgStr = mfg.toISOString().slice(0, 10);
    const expStr = exp.toISOString().slice(0, 10);
    const suffix = invoiceNumber.replace(/\W/g, "").slice(-4) || String(fileIdx + 1).padStart(4, "0");

    const itemsForFile = activeItems.filter((_, itemIdx) =>
      files.length === 1 ? true : itemIdx % files.length === fileIdx,
    );

    itemsForFile.forEach((it, idx) => {
      const splitQty =
        files.length === 1
          ? it.receivedQty
          : Math.max(1, Math.floor(it.receivedQty / files.length));

      batches.push({
        productId: it.productId,
        productName: it.productName,
        poNumber: it.poNumber,
        invoiceNumber,
        invoiceDate,
        batchNumber: `B-${suffix}-${String(idx + 1).padStart(2, "0")}`,
        mfgDate: mfgStr,
        expDate: expStr,
        quantity: splitQty,
        gstRate: 12,
        invoiceRate: 450 + idx * 25 + fileIdx * 10,
      });
    });
  });

  return batches;
}
