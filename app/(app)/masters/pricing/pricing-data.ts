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

export const PRICING_STORAGE_KEY = "ds_master_pricing_v1";

export interface PricingRecord extends BaseMasterRecord {
  productId: number;
  sku: string;
  productName: string;
  segment: string;
  category: string;
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
  costPrice: 0,
  distributorPrice: 0,
  retailPrice: 0,
  mrp: 0,
  status: "active",
};

export const PRICING_SEED: PricingRecord[] = [
  {
    id: 1,
    productId: 1,
    sku: "SEED-CORN-001",
    productName: "Dharitri Hybrid Corn Gold",
    segment: "Rakshak",
    category: "Seeds",
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
    costPrice: 320,
    distributorPrice: 400,
    retailPrice: 520,
    mrp: 650,
    status: "inactive",
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
    costPrice: 290,
    distributorPrice: 380,
    retailPrice: 490,
    mrp: 620,
    status: "inactive",
    createdBy: MASTER_CURRENT_USER,
    updatedBy: MASTER_CURRENT_USER,
    createdAt: "2024-02-16",
    updatedAt: "2024-02-16",
  },
];

export function loadPricingRecords(): PricingRecord[] {
  return loadMasterRecords<PricingRecord>(PRICING_STORAGE_KEY, PRICING_SEED);
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
  "id" | "sku" | "productName" | "segment" | "category"
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
  };
}

export function pricingToForm(record: PricingRecord): PricingForm {
  return {
    productId: String(record.productId),
    productName: record.productName,
    sku: record.sku,
    segment: record.segment,
    category: record.category,
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

export function validatePricingForm(
  form: PricingForm,
  records: PricingRecord[],
  excludeId?: number,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.productId) {
    errors.productId = "Product / SKU is required.";
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
