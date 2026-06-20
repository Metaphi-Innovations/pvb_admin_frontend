import {
  MASTER_CURRENT_USER,
  masterToday,
  type BaseMasterRecord,
  type MasterStatus,
} from "@/lib/masters/common";
import { loadMasterRecords, saveMasterRecords } from "@/lib/masters/common";
import {
  formatIndianRupeeDisplay,
  validatePricingHierarchy,
} from "@/lib/currency/indian-rupee";
import { loadProducts, type Product } from "../products/product-data";

export { formatIndianRupeeDisplay };

export const PRICING_STORAGE_KEY = "ds_master_pricing_v2";
export const PRICING_DEMO_SEED_VERSION = "2026-jun-cp-v1";
const PRICING_SEED_VERSION_KEY = "ds_pricing_seed_version";

export interface PricingRecord extends BaseMasterRecord {
  productId: number;
  sku: string;
  productName: string;
  segment: string;
  category: string;
  baseUnit: string;
  uom: string;
  packSize: string;
  unitsPerCase: number;
  gstPct: number;
  costPrice: number;
  distributorPrice: number;
  retailPrice: number;
  mrp: number;
}

export interface PricingForm {
  productId: string;
  productName: string;
  sku: string;
  segment: string;
  category: string;
  baseUnit: string;
  uom: string;
  packSize: string;
  unitsPerCase: number;
  gstPct: number;
  costPrice: number;
  distributorPrice: number;
  retailPrice: number;
  mrp: number;
  status: MasterStatus;
}

export const DEFAULT_PRICING_FORM: PricingForm = {
  productId: "",
  productName: "",
  sku: "",
  segment: "",
  category: "",
  baseUnit: "",
  uom: "",
  packSize: "",
  unitsPerCase: 1,
  gstPct: 0,
  costPrice: 0,
  distributorPrice: 0,
  retailPrice: 0,
  mrp: 0,
  status: "active",
};

function migratePricingRecord(raw: Partial<PricingRecord>): PricingRecord {
  return {
    id: raw.id ?? 0,
    productId: raw.productId ?? 0,
    sku: raw.sku ?? "",
    productName: raw.productName ?? "",
    segment: raw.segment ?? "",
    category: raw.category ?? "",
    baseUnit: raw.baseUnit ?? raw.uom ?? "",
    uom: raw.uom ?? "",
    packSize: raw.packSize ?? "",
    unitsPerCase: raw.unitsPerCase ?? 1,
    gstPct: raw.gstPct ?? 0,
    costPrice: raw.costPrice ?? 0,
    distributorPrice: raw.distributorPrice ?? 0,
    retailPrice: raw.retailPrice ?? 0,
    mrp: raw.mrp ?? 0,
    status: raw.status ?? "active",
    createdBy: raw.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: raw.updatedBy ?? MASTER_CURRENT_USER,
    createdAt: raw.createdAt ?? masterToday(),
    updatedAt: raw.updatedAt ?? masterToday(),
  };
}

export const PRICING_SEED: PricingRecord[] = [
  {
    id: 1,
    productId: 1,
    sku: "SEED-CORN-001",
    productName: "Dharitri Hybrid Corn Gold",
    segment: "Rakshak",
    category: "Seeds",
    baseUnit: "KG",
    uom: "Bag",
    packSize: "25 KG",
    unitsPerCase: 20,
    gstPct: 0,
    costPrice: 450,
    distributorPrice: 550,
    retailPrice: 700,
    mrp: 850,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-01-12",
    updatedAt: "2024-01-12",
  },
  {
    id: 2,
    productId: 2,
    sku: "FERT-WSF-019",
    productName: "NutriGrow WS 19:19:19",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "Box",
    packSize: "10 KG",
    unitsPerCase: 10,
    gstPct: 5,
    costPrice: 380,
    distributorPrice: 480,
    retailPrice: 620,
    mrp: 750,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-01-18",
    updatedAt: "2024-02-05",
  },
  {
    id: 3,
    productId: 3,
    sku: "PEST-EC-221",
    productName: "Shield EC Crop Guard",
    segment: "Rakshak",
    category: "Pesticides",
    baseUnit: "L",
    uom: "Drum",
    packSize: "1 L",
    unitsPerCase: 12,
    gstPct: 18,
    costPrice: 320,
    distributorPrice: 400,
    retailPrice: 520,
    mrp: 650,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-02-03",
    updatedAt: "2024-03-10",
  },
  {
    id: 4,
    productId: 4,
    sku: "BIO-SUS-104",
    productName: "BioRoot Vital Suspension",
    segment: "Amritam",
    category: "Bio Products",
    baseUnit: "L",
    uom: "Packet",
    packSize: "1 L",
    unitsPerCase: 24,
    gstPct: 12,
    costPrice: 290,
    distributorPrice: 380,
    retailPrice: 490,
    mrp: 620,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-02-16",
    updatedAt: "2024-02-16",
  },
  {
    id: 5,
    productId: 5,
    sku: "FERT-UREA-50",
    productName: "Urea 50kg",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerCase: 40,
    gstPct: 5,
    costPrice: 280,
    distributorPrice: 340,
    retailPrice: 420,
    mrp: 520,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
  },
  {
    id: 6,
    productId: 6,
    sku: "FERT-NPK-1026",
    productName: "NPK 10:26:26",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerCase: 40,
    gstPct: 5,
    costPrice: 380,
    distributorPrice: 460,
    retailPrice: 580,
    mrp: 720,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
  },
  {
    id: 7,
    productId: 7,
    sku: "FERT-DAP-50",
    productName: "DAP 50kg",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerCase: 40,
    gstPct: 5,
    costPrice: 520,
    distributorPrice: 620,
    retailPrice: 780,
    mrp: 950,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
  },
  {
    id: 8,
    productId: 8,
    sku: "FERT-ZNS-21",
    productName: "Zinc Sulphate 21%",
    segment: "Poshak",
    category: "Fertilizers",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "25 KG",
    unitsPerCase: 48,
    gstPct: 5,
    costPrice: 240,
    distributorPrice: 300,
    retailPrice: 380,
    mrp: 480,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
  },
  {
    id: 9,
    productId: 9,
    sku: "SEED-MAIZE-001",
    productName: "Hybrid Maize Seed",
    segment: "Rakshak",
    category: "Seeds",
    baseUnit: "KG",
    uom: "BAG",
    packSize: "25 KG",
    unitsPerCase: 20,
    gstPct: 0,
    costPrice: 450,
    distributorPrice: 550,
    retailPrice: 700,
    mrp: 850,
    status: "active",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
  },
];

/** Re-seed demo CP values when version bumps (demo environments). */
export function ensurePricingDemoSeed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PRICING_SEED_VERSION_KEY) === PRICING_DEMO_SEED_VERSION) return;
  saveMasterRecords(PRICING_STORAGE_KEY, PRICING_SEED);
  localStorage.setItem(PRICING_SEED_VERSION_KEY, PRICING_DEMO_SEED_VERSION);
}

export function loadPricingRecords(): PricingRecord[] {
  ensurePricingDemoSeed();
  const records = loadMasterRecords<PricingRecord>(PRICING_STORAGE_KEY, PRICING_SEED);
  return records.map((r) => migratePricingRecord(r));
}

export function savePricingRecords(records: PricingRecord[]): void {
  saveMasterRecords(PRICING_STORAGE_KEY, records);
}

export function getPricingById(id: number): PricingRecord | undefined {
  return loadPricingRecords().find((r) => r.id === id);
}

export function loadActiveProductOptions(): { value: string; label: string }[] {
  return loadProducts()
    .filter((p) => p.status === "active" && p.sku.trim())
    .map((p) => ({
      value: String(p.id),
      label: `${p.sku} — ${p.productName}`,
    }));
}

export function resolveProductForPricing(productId: string): Pick<
  Product,
  "id" | "sku" | "productName" | "segment" | "category" | "baseUnit" | "packagingUnit" | "conversionQuantity" | "gstRate"
> | null {
  const id = Number(productId);
  if (!id) return null;
  const product = loadProducts().find((p) => p.id === id);
  if (!product) return null;
  return {
    id: product.id,
    sku: product.sku,
    productName: product.productName,
    segment: product.segment,
    category: product.category,
    baseUnit: product.baseUnit,
    packagingUnit: product.packagingUnit,
    conversionQuantity: product.conversionQuantity,
    gstRate: product.gstRate,
  };
}

export function parseGstPct(gstRate: string | undefined): number {
  if (!gstRate) return 0;
  const n = parseFloat(gstRate.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function pricingToForm(record: PricingRecord): PricingForm {
  return {
    productId: String(record.productId),
    productName: record.productName,
    sku: record.sku,
    segment: record.segment,
    category: record.category,
    baseUnit: record.baseUnit,
    uom: record.uom,
    packSize: record.packSize,
    unitsPerCase: record.unitsPerCase,
    gstPct: record.gstPct,
    costPrice: record.costPrice,
    distributorPrice: record.distributorPrice,
    retailPrice: record.retailPrice,
    mrp: record.mrp,
    status: record.status,
  };
}

export function formToPricing(
  form: PricingForm,
  id: number,
  existing?: PricingRecord,
): PricingRecord {
  const now = masterToday();
  return {
    id,
    productId: Number(form.productId),
    sku: form.sku.trim(),
    productName: form.productName.trim(),
    segment: form.segment.trim(),
    category: form.category.trim(),
    baseUnit: form.baseUnit.trim(),
    uom: form.uom.trim(),
    packSize: form.packSize.trim(),
    unitsPerCase: form.unitsPerCase || 1,
    gstPct: form.gstPct,
    costPrice: form.costPrice,
    distributorPrice: form.distributorPrice,
    retailPrice: form.retailPrice,
    mrp: form.mrp,
    status: form.status,
    createdBy: existing?.createdBy ?? MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function findActivePricingForProduct(
  productId: number,
  records: PricingRecord[],
  excludeId?: number,
): PricingRecord | undefined {
  return records.find(
    (r) =>
      r.productId === productId &&
      r.status === "active" &&
      r.id !== excludeId,
  );
}

/** Resolve active pricing by SKU or product name (for warehouse stock rows). */
export function findActivePricingForStock(
  sku: string,
  productName: string,
): PricingRecord | undefined {
  const records = loadPricingRecords().filter((r) => r.status === "active");
  const norm = (s: string) => s.trim().toLowerCase();

  const bySku = records.find((r) => r.sku === sku);
  if (bySku) return bySku;

  const byName = records.find((r) => norm(r.productName) === norm(productName));
  if (byName) return byName;

  const product = loadProducts().find(
    (p) => p.sku === sku || norm(p.productName) === norm(productName),
  );
  if (product) {
    return records.find((r) => r.productId === product.id);
  }

  return undefined;
}

export function validatePricingForm(
  form: PricingForm,
  records: PricingRecord[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.productId) {
    errors.productId = "Product / SKU is required.";
  }

  if (!form.uom.trim()) {
    errors.uom = "UOM is required.";
  }

  if (!form.costPrice || form.costPrice <= 0) {
    errors.costPrice = "Cost Price (CP) is required.";
  }
  if (!form.distributorPrice || form.distributorPrice <= 0) {
    errors.distributorPrice = "Distributor Price (DP) is required.";
  }
  if (!form.retailPrice || form.retailPrice <= 0) {
    errors.retailPrice = "Retail Price (RP) is required.";
  }
  if (!form.mrp || form.mrp <= 0) {
    errors.mrp = "MRP is required.";
  }

  const hierarchyError = validatePricingHierarchy(
    form.costPrice,
    form.distributorPrice,
    form.retailPrice,
    form.mrp,
  );
  if (hierarchyError) {
    errors.pricingHierarchy = hierarchyError;
  }

  if (form.productId && form.status === "active") {
    const duplicate = findActivePricingForProduct(
      Number(form.productId),
      records,
      excludeId,
    );
    if (duplicate) {
      errors.productId = `An active pricing record already exists for SKU "${duplicate.sku}".`;
    }
  }

  return errors;
}
