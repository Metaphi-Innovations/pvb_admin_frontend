import {
  PurchaseOrder,
  GrnRecord,
  ProductItem,
  GrnItem,
  GrnBatch,
  GrnStatus,
  GrnOcrExtractedInvoice,
  GrnSupplierInvoice,
} from "../types";

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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    items: [
      { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 400, receivedQty: 400, unit: "BAG" },
      { productId: "11", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 200, receivedQty: 200, unit: "BAG" },
    ],
    batches: [
      { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", batchNumber: "BURA-26A", mfgDate: "2026-02-01", expDate: "2028-02-01", quantity: 400 },
      { productId: "11", productName: "DAP 50kg", productCode: "FER-DAP-004", batchNumber: "BDAP-26A", mfgDate: "2026-02-15", expDate: "2028-02-15", quantity: 200 },
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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
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
    status: "pending_qc",
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    items: [
      { productId: "4", productName: "DAP 50kg", productCode: "FER-DAP-004", orderedQty: 400, receivedQty: 380, unit: "BAG" },
      { productId: "5", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", orderedQty: 150, receivedQty: 140, unit: "KG" },
    ],
    batches: [
      { productId: "4", productName: "DAP 50kg", productCode: "FER-DAP-004", batchNumber: "B-DAP-33C", mfgDate: "2023-12-01", expDate: "2025-12-01", quantity: 380 },
      { productId: "5", productName: "Zinc Sulphate 21%", productCode: "CHEM-ZN-005", batchNumber: "B-ZN-77Y", mfgDate: "2023-11-15", expDate: "2025-11-15", quantity: 140 },
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
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    items: [
      { productId: "4", productName: "Chlorpyrifos 20 EC", productCode: "PRD-004", orderedQty: 100, receivedQty: 60, unit: "LTR", batchNumber: "B-CP-24A", mfgDate: "2023-10-01", expDate: "2025-10-01", inventoryTracked: true },
    ],
    batches: [
      { productId: "4", productName: "Chlorpyrifos 20 EC", batchNumber: "B-CP-24A", mfgDate: "2023-10-01", expDate: "2025-10-01", quantity: 60 },
    ],
  },
  {
    id: "grn-5",
    grnNo: "GRN-2024-005",
    poNumber: "PO-2024-005",
    vendorName: "Agro Chem Distributors",
    warehouse: "North Zone Hub",
    grnDate: "2024-02-08",
    totalProducts: 1,
    totalQty: 150,
    status: "pending_qc",
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    items: [
      { productId: "6", productName: "Imidacloprid 17.8% SL", productCode: "PES-IMI-002", orderedQty: 150, receivedQty: 150, unit: "LTR" },
    ],
    batches: [
      { productId: "6", productName: "Imidacloprid 17.8% SL", productCode: "PES-IMI-002", batchNumber: "B-IMI-26A", mfgDate: "2026-01-15", expDate: "2028-01-15", quantity: 150 },
    ],
  },
  {
    id: "grn-6",
    grnNo: "GRN-2024-006",
    poNumber: "PO-2024-006",
    vendorName: "Seed Corp India Pvt Ltd",
    warehouse: "South Zone Depot",
    grnDate: "2024-02-09",
    totalProducts: 2,
    totalQty: 320,
    status: "pending_qc",
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    items: [
      { productId: "7", productName: "Hybrid Paddy Seed 5kg", productCode: "SED-PD-001", orderedQty: 200, receivedQty: 200, unit: "PKT" },
      { productId: "8", productName: "Bio Fungicide", productCode: "BIO-FG-003", orderedQty: 120, receivedQty: 120, unit: "LTR" },
    ],
    batches: [
      { productId: "7", productName: "Hybrid Paddy Seed 5kg", productCode: "SED-PD-001", batchNumber: "B-PD-26X", mfgDate: "2025-11-01", expDate: "2026-11-01", quantity: 200 },
      { productId: "8", productName: "Bio Fungicide", productCode: "BIO-FG-003", batchNumber: "B-BF-26Y", mfgDate: "2026-02-01", expDate: "2028-02-01", quantity: 120 },
    ],
  },
  {
    id: "grn-7",
    grnNo: "GRN-2024-007",
    poNumber: "PO-2024-007",
    vendorName: "Kisan Inputs Pvt Ltd",
    warehouse: "Central Warehouse",
    grnDate: "2024-02-10",
    totalProducts: 1,
    totalQty: 280,
    status: "pending_qc",
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    items: [
      { productId: "9", productName: "Mancozeb 75% WP", productCode: "PES-MAN-001", orderedQty: 280, receivedQty: 280, unit: "KG" },
    ],
    batches: [
      { productId: "9", productName: "Mancozeb 75% WP", productCode: "PES-MAN-001", batchNumber: "B-MAN-26Z", mfgDate: "2026-01-20", expDate: "2028-01-20", quantity: 280 },
    ],
  },
  {
    id: "grn-8",
    grnNo: "GRN-2024-008",
    poNumber: "PO-2024-008",
    vendorName: "Bharat Fertilizers",
    warehouse: "West Zone Hub",
    grnDate: "2024-02-12",
    totalProducts: 2,
    totalQty: 450,
    status: "pending_qc",
    supplierInvoices: [],
    ocrExtractedInvoices: [],
    ocrExtractionCompleted: false,
    items: [
      { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", orderedQty: 300, receivedQty: 300, unit: "BAG" },
      { productId: "11", productName: "NPK 10:26:26", productCode: "FER-NPK-002", orderedQty: 150, receivedQty: 150, unit: "BAG" },
    ],
    batches: [
      { productId: "10", productName: "Urea 50kg", productCode: "FER-UR-001", batchNumber: "B-UR-26Q", mfgDate: "2026-02-01", expDate: "2028-02-01", quantity: 300 },
      { productId: "11", productName: "NPK 10:26:26", productCode: "FER-NPK-002", batchNumber: "B-NPK-26Q", mfgDate: "2026-02-05", expDate: "2028-02-05", quantity: 150 },
    ],
  },
];

const LOCAL_STORAGE_KEY = "ds_grn_records_v3";

function normalizeGrnStatus(status: string): GrnStatus {
  if (status === "draft" || status === "submitted" || status === "qc_pending" || status === "qc_in_progress") {
    return "pending_qc";
  }
  return "qc_completed";
}

function normalizeGrnRecord(record: GrnRecord): GrnRecord {
  const supplierInvoices: GrnSupplierInvoice[] =
    record.supplierInvoices ??
    (record.invoiceFileNames ?? (record.invoiceFileName ? [record.invoiceFileName] : [])).map(
      (name, idx) => ({
        id: `legacy-inv-${idx}`,
        fileName: name,
        uploadedAt: record.grnDate,
      }),
    );

  const ocrExtractedInvoices = (record.ocrExtractedInvoices ?? []).map((inv) => ({
    ...inv,
    lineItems: inv.lineItems.map((line) => ({
      ...line,
      mfgDate: line.mfgDate ?? "",
      expDate: line.expDate ?? "",
      gstAmount: line.gstAmount ?? 0,
    })),
  }));

  const batches: GrnBatch[] = record.batches.map((b) => {
    const item = record.items.find((it) => it.productId === b.productId);
    const ocrLine = ocrExtractedInvoices
      .flatMap((inv) => inv.lineItems)
      .find((line) => line.batchNumber === b.batchNumber && line.sku === (b.productCode || item?.productCode));
    const invoiceQty = b.invoiceQty ?? ocrLine?.invoiceQty ?? b.quantity;
    const unitPrice = b.unitPrice ?? ocrLine?.unitPrice;
    const gstPct = b.gstPct ?? ocrLine?.gst;
    const subtotal = unitPrice != null ? invoiceQty * unitPrice : undefined;
    const gstAmount =
      b.gstAmount ??
      ocrLine?.gstAmount ??
      (subtotal != null && gstPct != null ? Math.round(subtotal * (gstPct / 100) * 100) / 100 : undefined);
    const totalAmount = b.totalAmount ?? ocrLine?.totalAmount;

    return {
      ...b,
      productCode: b.productCode ?? item?.productCode ?? "",
      invoiceQty,
      unitPrice,
      gstPct,
      gstAmount,
      totalAmount,
    };
  });

  return {
    ...record,
    status: normalizeGrnStatus(record.status as string),
    supplierInvoices,
    ocrExtractedInvoices,
    ocrExtractionCompleted: record.ocrExtractionCompleted ?? ocrExtractedInvoices.length > 0,
    batches,
  };
}

function mergeSeedGrns(stored: GrnRecord[]): GrnRecord[] {
  const byId = new Map(stored.map((g) => [g.id, g]));
  for (const seed of SEED_GRNS) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  return Array.from(byId.values()).map(normalizeGrnRecord);
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

/** Sum qty already received for a PO line from saved GRNs */
export function getAlreadyReceivedQty(poNumber: string, productId: string): number {
  const records = getGrnRecords();
  let total = 0;
  for (const grn of records) {
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

/** Effective qty for OCR/batch: current received, or pending if not yet entered */
export function getEffectiveReceiptQty(item: GrnItem): number {
  if (item.receivedQty > 0) return item.receivedQty;
  return item.pendingQty ?? Math.max(0, item.orderedQty - (item.alreadyReceivedQty ?? 0));
}

export function buildGrnBatchesFromOcr(
  ocrInvoices: GrnOcrExtractedInvoice[],
  items: GrnItem[],
): GrnBatch[] {
  const batches: GrnBatch[] = [];

  for (const inv of ocrInvoices) {
    for (const line of inv.lineItems) {
      const item = items.find(
        (it) =>
          it.productCode === line.sku ||
          it.productName === line.productName,
      );
      if (!item) continue;

      const subtotal = line.invoiceQty * line.unitPrice;
      const gstAmount = line.gstAmount ?? Math.round(subtotal * (line.gst / 100) * 100) / 100;

      batches.push({
        productId: item.productId,
        productName: line.productName,
        productCode: line.sku,
        batchNumber: line.batchNumber,
        mfgDate: line.mfgDate,
        expDate: line.expDate,
        quantity: line.invoiceQty,
        invoiceQty: line.invoiceQty,
        unitPrice: line.unitPrice,
        gstPct: line.gst,
        gstAmount,
        totalAmount: line.totalAmount,
        poNumber: item.poNumber,
        invoiceNumber: inv.invoiceNumber,
      });
    }
  }

  return batches;
}

/** Mock OCR extraction — stores invoice data; batch rows derived via buildGrnBatchesFromOcr */
export function mockExtractInvoiceDataFromFiles(
  files: { id: string; name: string }[],
  items: GrnItem[],
  vendorName: string,
): GrnOcrExtractedInvoice[] {
  const activeItems = items.filter((it) => getEffectiveReceiptQty(it) > 0);
  if (files.length === 0 || activeItems.length === 0) {
    return [];
  }

  const today = new Date();
  const ocrInvoices: GrnOcrExtractedInvoice[] = [];

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
    const confidenceScore = 0.88 + fileIdx * 0.03;

    const itemsForFile = activeItems.filter((_, itemIdx) =>
      files.length === 1 ? true : itemIdx % files.length === fileIdx,
    );

    const lineItems: GrnOcrExtractedInvoice["lineItems"] = [];

    itemsForFile.forEach((it, idx) => {
      const effectiveQty = getEffectiveReceiptQty(it);
      const splitQty =
        files.length === 1
          ? effectiveQty
          : Math.max(1, Math.floor(effectiveQty / files.length));
      const unitPrice = 450 + idx * 25 + fileIdx * 10;
      const gst = 12;
      const subtotal = splitQty * unitPrice;
      const gstAmount = Math.round(subtotal * (gst / 100) * 100) / 100;
      const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
      const batchNumber = `B-${suffix}-${String(idx + 1).padStart(2, "0")}`;

      lineItems.push({
        productName: it.productName,
        sku: it.productCode,
        batchNumber,
        mfgDate: mfgStr,
        expDate: expStr,
        invoiceQty: splitQty,
        unitPrice,
        gst,
        gstAmount,
        totalAmount,
      });
    });

    ocrInvoices.push({
      invoiceId: `ocr-${file.id}`,
      supplierName: vendorName,
      invoiceNumber,
      invoiceDate,
      sourceFileId: file.id,
      confidenceScore: Math.min(confidenceScore, 0.99),
      lineItems,
      extractedAt: today.toISOString(),
    });
  });

  return ocrInvoices;
}
